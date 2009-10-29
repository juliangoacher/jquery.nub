/**
 * jquery.nub-frames.js
 * Frames extension for jquery.nub, providing functionality for the loading and display of content
 * in response to updates to the MVC model.
 *
 * Copyright (c) 2009 Julian Goacher
 * Dual licensed under the MIT (MIT-LICENSE.txt) and GPL (GPL-LICENSE.txt) licenses.
 *
 * @author Julian Goacher
 * @version 0.8
 */
(function($) {

    if( !$.nub ) throw new Error("jquery.nub.js required");

    $.nub.frames = {};

    $.nub.type('/setup/*', $.nub.model.types.remote );

    function Frame( options ) {
        options = options||{};
        /**
         * Function for loading the frame layout. Accepts the frame element and content key
         * as arguments. Default function does nothing.
         */
        this.loadLayout = options.loadLayout||$.nub.noop;
        /**
         * Function for loading the frame data content. Accepts the content key as its
         * argument. Default function does nothing.
         */
        this.loadData = options.loadData||$.nub.noop;
        /**
         * Initialization function which allows the container element to be initialized.
         * Default function does nothing.
         */
        this.init = options.init||$.nub.noop;
        /**
         * Update function. Default function reads content key from the model, invokes the
         * layout function and then the data function.
         */
        this.update = options.update||function( elem, keyRef, context ) {
            var key = $.nub.get( keyRef, context );
            this.loadLayout( elem, key );
            this.loadData( key );
            this.onupdate( elem, keyRef, context, key );
        };
        /** Callback function for when an update is performed. Default function does nothing. */
        this.onupdate = options.onupdate||$.nub.noop;
    };

    /**
     * A function for switching an element's visible data content. The content is modelled as a
     * map of child elements, keyed by a content item ID. Only one child element is visible at
     * a time. This function hides the currently visible child (if any) then makes visible the
     * requested child. Returns 'true' if the requested child exists, or 'false' if no child
     * with the requested ID exists.
     */
    function makeContentVisible( elem, cid ) {
        var content = $(elem).data('content');
        if( content === undefined ) {
            throw new Error("makeContentVisible(): element must have a 'content' data item");
        }
        if( content['$visible'] ) {
            $(content['$visible']).hide();
            delete content['$visible'];
        }
        if( cid && content[cid] ) {
            content['$visible'] = content[cid];
            $(content['$visible']).show();
            return true;
        }
        return false;
    }

    DynamicFrame.prototype = new Frame();
    function DynamicFrame( options ) {
        /** Function to generate a URI for the layout from the content key. */
        this.makeLayoutURI = options.makeLayoutURI||$.coop.identity;
        /** Function to generate a new content item. */
        this.makeContentItem = options.makeContentItem||function() {
            return document.createElement('div');
        };
        /** Function to generate a URI for the setup script associated with a layout. */
        this.makeSetupURI = options.makeSetupURI||function( key ) {
            return this.makeLayoutURI( key )+'.setup.js';
        };
        /** Initialize a container element for use with this frame. */
        this.init = function( elem ) {
            // A map of content item's, keyed by their content key.
            $(elem).data('content',{});
        };
        /** Load the layout for the specified content key into a container element. */
        this.loadLayout = function( elem, key ) {
            // If no key is specified then display the default content item (if any); otherwise,
            // attempt to display the content item identified by the key; if that fails, then
            // create a new content item.
            if( key === undefined ) {
                makeContentVisible( elem, '__default__');
            }
            else if( !makeContentVisible( elem, key ) ) {
                // Make a new content item and add to the container.
                var item = elem.appendChild( this.makeContentItem() );
                // Create a model path to store the setup function at.
                var setupURI = this.makeSetupURI( key );
                var setupRef = '/setup/'+encodeURIComponent( setupURI );
                // Request the setup file.
                var setup = $.nub.get( setupRef );
                setup.lazyLoad( setupURI, 'text');
                // Generate the layout's URI from the content key.
                var uri = this.makeLayoutURI( key );
                // Callback to apply the setup function once content is loaded.
                function applySetup() {
                    setup.whenAvailable( function( setup ) {
                        // Timeout is to ensure that the DOM is rendered before applying the setup.
                        window.setTimeout(function() {
                            // Check for any errors parsing the setup file.
                            if( setup.meta['ajax-status'] == 'parsererror' ) {
                                throw new Error("Error parsing setup file: "+setupURI );
                            }
                            // The setup code is requested as text (this is more reliable across
                            // browsers). Evaluate the setup code then check that we have a function.
                            eval('var setupFn='+setup.data);
                            setup.data = setupFn;
                            if( $.isFunction( setup.data ) ) {
                                // Apply the setup function to the content item.
                                setup.data.apply( item );
                            }
                            else throw new Error("Setup data must be a function: "+setupURI );
                        }, 0 ); // setTimeout
                    });
                };
                // Load the layout from the URI.
                $(item).load( uri, undefined, applySetup );
                // Add the stack item to the stack.
                var content = $(elem).data('content');
                content[key] = item;
                content['$visible'] = item;
            }
        }
    };

    // Export frame constructors.
    $.nub.frames.Frame = Frame;
    $.nub.frames.DynamicFrame = DynamicFrame;
    /** A frame for displaying HTML loaded from a remote source. */
    HTMLFrame.prototype = new Frame( {
        loadLayout: function( elem, key ) {
            $(elem).load( key );
        }
    } );
    function HTMLFrame() {};
    $.nub.frames.HTMLFrame = HTMLFrame;

    /**
     * A frame which switches between pre-loaded child elements according to the value of its
     * content key.
     */
    $.nub.model.options.contentIDAttr = 'id';
    SwitchedHTMLFrame.prototype = new Frame( {
        init: function( elem ) {
            var cid = this.cid;
            var content = {};
            $(elem)
                .data('content',content).data('cid',cid)
                // Find child elements with an attribute named with 'cid's value.
                .children('['+cid+']').each( function() {
                    content[$(this).attr( cid )] = this;
                    $(this).hide();
                });
        },
        loadLayout: function( elem, key ) {
            if( !makeContentVisible( elem, key ) ) {
                makeContentVisible( elem, '$default' );
            }
        }
    } );
    function SwitchedHTMLFrame( options ) {
        this.cid = $.nub.model.options.contentIDAttr;
        if( options !== undefined && options.cid !== undefined ) {
            this.cid = options.cid;
        }
    };
    $.nub.frames.SwitchedHTMLFrame = SwitchedHTMLFrame;

    /**
     * Apply a frame to an element. Options are:
     * - frame:     The frame object to apply. (Optional; if not supplied then a standard Frame
     *   will be instantiated and passed the options object).
     * - keyRef:    The content key reference. (Optional).
     * - getKeyRef: A function for reading the frame's content key reference from the frame element.
     */
    $.fn.nubFrame = function( options ) {
        if( options === undefined ) throw new Error('No frame options supplied');
        // Resolve the frame object.
        var frame = options.frame||new Frame( options );
        if( !$.isFunction( frame.update ) ) throw new Error('Frame object must have an "update" method');
        // Resolve a function for reading the frame content key reference.
        var getKeyRef;
        if( options.keyRef !== undefined ) {
            getKeyRef = $.nub.constant( options.keyRef );
        }
        else if( $.isFunction( options.getKeyRef ) ) {
            getKeyRef = options.keyRefFn;
        }
        else if( $.isFunction( frame.getKeyRef ) ) {
            getKeyRef = frame.getKeyRef;
        }
        else throw new Error('Unable to resolve key reference');
        // Apply the frame.
        return $(this).each(function() {
            var elem = this;
            if( $.isFunction( frame.init ) ) {
                frame.init( elem );
            }
            var keyRef = getKeyRef( elem );
            $.nub.view( keyRef, function() {
                frame.update( elem, keyRef, options.context );
            }, options.context );
        });
    };
})(jQuery);
