/**
 * jquery.nub.js
 * An MVC and navigation framework for producing multi-screen UIs using jQuery.
 *
 * Copyright (c) 2009 Julian Goacher
 * Dual licensed under the MIT (MIT-LICENSE.txt) and GPL (GPL-LICENSE.txt) licenses.
 *
 * A single JavaScript object serves as the global model. Data items in the model are referenced
 * using a path which specifies the child property of each parent object which must be followed
 * to locate the target value (e.g. 'company/address/city').
 *
 * HTML nodes or callback functions may register with the MVC as views on values by passing
 * the value's reference path, and will receive notification whenever the value is updated or
 * deleted.
 *
 * The model is fully typed. Custom types can be registered which allow translation between the
 * value held by the model and external representations of that value (i.e. custom formatting
 * and parsing of data values). Additionally, format options can be specified (globally or
 * local to the data view) which allow modification of the data type's default behaviour.
 *
 * Based on an idea by Mark Gibson (jollytoad), see http://jollytoad.googlepages.com/mvcusingjquery
 *
 * @author Julian Goacher
 * @version 0.8
 */
(function($) {
    /** The nub namespace. */
    $.nub = {
        /** The identity function. */
        identity: function( a ) { return a; },
        /** A no-op (i.e. do nothing) function. */
        noop: function() {},
        /** A function which takes a value and returns a function which always returns that value. */
        constant: function( c ) { return function() { return c; }; },
        /** Functions for creating filter criteria. */
        criteria: {
            equals: function( id, value, nonEmptyValue ) {
                if( value === undefined ) return $.nub.constant( true );
                if( !value && nonEmptyValue ) return $.nub.constant( true );
                return function( obj ) {
                    return obj !== undefined && obj[id] == value;
                };
            },
            lte: function( id, value ) {
                if( value === undefined ) return $.nub.constant( true );
                return function( obj ) {
                    return obj !== undefined && obj[id] <= value;
                }
            },
            gte: function( id, value ) {
                if( value === undefined ) return $.nub.constant( true );
                return function( obj ) {
                    return obj !== undefined && obj[id] >= value;
                }
            }
        },
        /** The global data model. */
        model: {
            /** User data. */
            data: {},
            /** Registered model views. */
            views: {},
            /** Data types. */
            types: {}
        }
    };

    /** An object used to traverse the a model reference path. */
    function PathTraversalFrame( path, obj ) {
        var idx = 0;        // An index into the reference path.
        this.obj = obj;     // The current in-scope object.
        this.steps = [];    // Steps taken to the current object, i.e. descendent objects.
        this.path = [];     // Path taken to current object, i.e. property IDs.
        // Return the ID of the next item on the path.
        this.nextID = function() { return path[idx]; };
        // Iterate to the next object on the path.
        this.next = function() {
            this.id = path[idx++];          // Resolve the next object ID.
            this.path.push( this.id );      // Record the ID.
            this.steps.push( this.obj );    // Mark the current object as parent to the next.
            this.obj = this.obj[this.id];   // Read the next object.
        };
        // Set the current object value.
        this.set = function( val ) {
            this.steps[idx-1][this.id] = this.obj = val; // Also updates the parent reference.
        };
        // Delete the current object value.
        this.del = function() {
            delete this.steps[idx-1][this.id];  // Delete the parent's reference.
            delete this.obj;                    // Delete the current object.
        };
        // Test whether the frame is at the last object of the path reference.
        this.end         = function() { return this.steps.length >= path.length; };
        // Return an array containing the portion of the reference path not yet processed.
        this.remaining   = function() { return path.slice( idx ); };
        // Return a path referencing the frame's current object.
        this.pathToFrame = function() { return makePath( this.path.slice( 0 ) ); };
    };

    /**
     * The base type, and default type to all data items in the model. Types allow specific data
     * items to have custom methods for formatting and parsing. The base type makes no modifications
     * to the model's data (other than to create new objects when a reference requires them), but
     * can be used to switch to a different type by specifying a type binding for a data item.
     */
    function BaseMVCType( bindings, initCons ) {
        // Data type bindings, keyed by property name.
        this.bindings = bindings||{};
        // Set the default type. If model.types.$default isn't set, then this is the default type.
        this.bindings['*'] = $.nub.model.types['$default']||this;
        // Object constructor to use when initializing properties.
        initCons = initCons||Object;
        // Internal get, set and delete operations.
        this.ops = {
            'get': function( frame, opts, value ) {
                return frame.obj;
            },
            'set': function( frame, opts, value ) {
                frame.set( value );
                $.nub.notify('set', frame );
                return value;
            },
            'del': function( frame, opts, value ) {
                value = frame.obj;
                frame.del();
                $.nub.notify('delete', frame );
                return value;
            }
        };
        // Recursively apply an operation and type to the model until the operation is completed.
        this.step = function( op, frame, opts, value ) {
            if( frame.end() ) {                                  // If at end of path...
                return this.ops[op]( frame, opts, value, this ); // ...then delegate to the specific type op.
            }
            var type = this.getType( frame.nextID() );    // Resolve the type of the next object on the path.
            frame.next();                                 // Move to the next object on the reference path.
            // If the new current object is undefined then check whether the value should be initialized.
            if( frame.obj === undefined ) {
                // The three cases where an initialization takes place are:
                // 1. A get operation, at the end of the path ref, if initOnGet is true,
                // 2. A get operation, before the end of the path ref, and initOnRef is true,
                // 3. A set operation, anywhere on the path, and initOnRef is true.
                // Not that 'initOnGet' and 'initOnRef' are from the type of the 'next' object.
                if( (op == 'get' && frame.end() ? type.initOnGet : type.initOnRef)
                        || (op == 'set' && type.initOnRef ) ) {
                    frame.set( type.init( frame, opts, value ) );
                }
                else return undefined;
            }
            return type[op]( frame, opts, value );  // Recurse using the bound type.
        };
        // Initialize undefined referenced properties when getting.
        this.initOnGet = false;
        // Initialize undefined intermediate values when getting or setting.
        this.initOnRef = true;
        // Initialize a data value.
        this.init = function( frame, opts, value ) {
            return new initCons(); // Return a new object using the configuration constructor.
        };
        // Get a data value. Other types can use this method to format the value.
        this.get = function( frame, opts ) {
            return this.step('get', frame, opts );
        };
        // Set a data value. Other types can use this method to parse the value.
        this.set = function( frame, opts, value ) {
            return this.step('set', frame, opts, value );
        };
        // Delete a data value.
        this.del = function( frame, opts, value ) {
            return this.step('del', frame, opts, value );
        };
        // Apply a type to a data reference.
        this.apply = function( op, ref, rcx, opts, opargs ) {
            var frame = new PathTraversalFrame( $.nub.path( ref, rcx ).copy(), $.nub.model );
            var args = [ frame, opts||$.nub.model.options ].concat( opargs );
            return this[op].apply( this, args );
        };
        // Get a type for the specified object property ID.
        this.getType = function( id ) {
            return this.bindings[id]||this.bindings['*'];
        };
        /**
         * Add a type binding. The 'id' argument can be either a path reference of a property
         * name. A path reference can contain wildcard property IDs, i.e. '*'.
         */
        this.bind = function( ref, type ) {
            if( ref.isModelPath ) {
                var id = ref.shift();
                if( ref.length == 0 ) {
                    this.bindings[id] = type;
                }
                else {
                    var subtype = this.bindings[id];
                    if( !subtype ) {
                        subtype = this.bindings[id] = new BaseMVCType();
                    }
                    if( $.isFunction( subtype.bind ) ) {
                        subtype.bind( ref, type );
                    }
                }
            }
            else this.bindings[ref] = type;
        };
        // Add multiple type bindings.
        this.addBindings = function( bindings ) {
            for( var ref in bindings ) this.bind( ref, bindings[ref] );
        };
    };
    // Export the base type's constructor.
    $.nub.BaseMVCType = BaseMVCType;

    /** The default type. Any data item without a binding defaults to this type. */
    $.nub.model.types['$default'] = new BaseMVCType();
    /** The base type of the global model. Bindings are added to this type. */
    $.nub.model.types.base = new BaseMVCType();
    /** A type where each untyped property defaults to an array. */
    ArrayMVCType.prototype = new BaseMVCType( {}, Array );
    function ArrayMVCType( bindings ) {
        this.addBindings( bindings );
        this.initOnGet = true;
    };
    /** A type used to manage MVC views within the model. */
    ViewMVCType.prototype = new BaseMVCType();
    function ViewMVCType() {
        this.bind('*', this );
        // Build a list of all mvc views associated with a node in the model.
        function gatherViews( node, list, deep ) {
            if( node ) {
                // Copy all views on the node which aren't already active.
                for( var i = 0, views = node.__views__; i < views.length; i++ ) {
                    if( !views[i].active ) list.push( views[i] );
                }
                // If 'deep' is true then include all views on all sub-nodes.
                if( deep ) {
                    for( var id in node ) {
                        if( id != '__views__' ) list = gatherViews( node[id], list, true );
                    }
                }
            }
            return list;
        };
        /**
         * Return an array of all views affected by a path. This includes all views :-
         * - registered against the data item at the exact path,
         * - registered against parent objects of the data item,
         * - registered against dependent children of the data item.
         */
        this.ops.get = function( frame, opts, value ) {
            var views = [];
            // Process parent nodes in context. Exclude (i) the first node, because this will be
            // processed in the following statement, and (ii) the last two nodes, which are the
            // 'views' property of the model, and the model root, respectively.
            for( var i = 2; i < frame.steps.length; views = gatherViews( frame.steps[i++], views ) );
            views = gatherViews( frame.obj, views, true );
            return views;
        };
        /** Add a view. 'value' is a view 4-tuple ( callback, object, path, options ). */
        this.ops.set = function( frame, opts, value ) {
            var views = frame.obj.__views__;
            views.push( value );
            $.nub.notify('set', frame );
            return views;
        };
        /** Remove a view. 'value' is the view object - a function or element. */
        this.ops.del = function( frame, opts, value ) {
            if( frame.obj !== undefined ) {
                var views = frame.obj.__views__;
                for( var i = 0; i < views.length; i += 4 ) {
                    if( views[i][0] === value ) {
                        views.splice( i, 1 );
                        $.nub.notify('delete', frame );
                        break;
                    }
                }
            }
        };
        this.init = function() { return { __views__:[] }; };
        this.id = 'ViewMVCType';
    };
    $.nub.model.types.base.bind('views', new ViewMVCType() );

    /**
     * A base data type. Useful for types used to format and parse values.
     */
    function DataMVCType( options ) {
        $.extend( this, {
            make: $.nub.identity,
            format: $.nub.identity,
            parse: $.nub.identity
        }, options );
        this.init = function( frame, opts, value ) {
            return this.make( value, opts, frame.remaining() );
        };
        this.get = function( frame, opts ) {
            var val = frame.obj;
            return opts['noformat'] ? val : this.format( val, opts, frame.remaining() );
                
        };
        this.set = function( frame, opts, newVal ) {
            var oldVal = frame.obj;
            var newVal = opts['noformat'] ? newVal: this.parse( newVal, oldVal, opts, frame.remaining() );
            frame.set( newVal );
            $.nub.notify('set', frame );
        };
        this.del = function( frame, opts ) {
            frame.del();
            $.nub.notify('delete', frame );
        };
        this.initOnRef=true;
    };
    // Export constructor.
    $.nub.DataMVCType = DataMVCType;

    /**
     * An object for representing data loaded from a remote location i.e. a server. The object has
     * two properties; 'meta' is used to hold meta-data on the loaded data, including the load
     * status and the URI the data was loaded from; 'data' is used to hold the actual loaded data.
     */
    function Remote( ref, opts, methods, uri ) {
        var nub = $.nub;
        ref = nub.path( ref );
        this.meta = { status: 'preload' };
        this.data = undefined;
        // Allow the basic object to be extended with custom handlers.
        $.extend( this, {
            // Serialize the data prior to an update. Default serializes to a JSON string.
            serialize: function() { return JSON.stringify( this.data ); },
            // Process a request before it is submitted. The function is passed an object with the
            // following properties and should return the modified argument.
            // - url, type, dataType, success, error: See load() method below for details.
            onrequest: $.nub.identity,
            // Process a response before the model is updated. The function is passed two arguments.
            // The first argument is the complete 'remote' object about to be written into the model.
            // The second argument is the HTTP method used for the request. The value returned by the
            // function is the value which will be copied into the model. See the update() function.
            onload: $.nub.identity
        }, methods );
        // Test whether the load point's data has been loaded.
        this.isLoaded = function() {
            var status = this.meta.status;
            return status !== undefined && !status.match(/^(preload|loading|submitting)/);
        };
        // Load the requested URI if its data has not already been loaded.
        this.lazyLoad = function( uri, type, options ) {
            if( !this.isLoaded() ) this.load( uri, type, options );
        };
        /**
         * Execute a callback function once the load point's data is available. Will execute immediately
         * if the data is already loaded. The callback will only be executed once if 'repeat' is false,
         * otherwise the callback is executed each time data is loaded.
         */
        this.whenAvailable = function( callback, repeat ) {
            var view = function() {
                var lp = nub.get( ref );
                if( lp.isLoaded() ) {
                    try {
                        callback( lp );
                    }
                    finally {
                        if( !repeat ) nub.removeView('meta/status', view, ref );
                    }
                }
            };
            nub.view('meta/status', view, ref );
        };
        // Update the model with a http response.
        function update( remote, ref, uri, status, method, data, error) {
            // Construct an object to replace the remote object currently in the model.
            remote = remote.onload( $.extend( {}, remote, {
                'meta': {
                    'error':       error,
                    'uri':         uri,
                    'timestamp':   new Date(),
                    'ajax-status': status,
                    'status':      'loaded',
                    'initData':    JSON.stringify( data )
                },
                'data': data
            } ), method );
            nub.set( ref, remote );
        };
        /**
         * Load data into the model load point. Uses an HTTP GET (unless specified otherwise in the
         * 'options' argument). The function creates a wrapper object for the data, with two properties,
         * 'meta' and 'data'. The loaded data is placed under the 'data' property, whilst information
         * about the loaded data is placed in the 'meta' object. Meta-data includes the URI the data
         * was requested from, the load status (one of 'preload', 'loaded', 'loading', 'submitting' or
         * 'error'), and an error object when in an error state.
         */
        this.load = function( uri, type, options ) {
            var remote = this;
            var args = $.extend( {
                url: uri,
                type: 'GET',
                dataType: type,
                success: function( data, status ) {
                    update( remote, ref, uri, status, 'GET', data );
                },
                error: function( xhr, status, err ) {
                    update( remote, ref, uri, status, 'GET', undefined, err );
                }
            }, options );
            args = remote.onrequest( args );
            nub.set('meta/status', args.type == 'GET' ? 'loading' : 'submitting', ref );
            nub.set('meta/dataType', type, ref );
            return $.ajax( args );
        };
        this.get = function( uri, options ) {
            return this.load( uri, 'json', $.extend( options, { type: 'GET' } ) );
        };
        this.put = function( uri, options ) {
            uri = uri||this.meta.uri;
            return this.load( uri, 'application/json',
                $.extend( options, { type: 'PUT', data: this.serialize() } ) );
        };
        this.post = function( uri, options ) {
            uri = uri||this.meta.uri;
            return this.load( uri, 'application/json',
                $.extend( options, { type: 'POST', data: this.serialize() } ) );;
        };
        // Reload the currently loaded data.
        this.reload = function() {
            if( this.meta.status == 'loaded' ) {
                this.load( this.meta.uri, this.meta.dataType );
            }
        };
        // Reset the data to its original loaded state.
        this.reset = function() {
            nub.set('data', JSON.parse( this.meta.initData ), ref );
        };
        // Perform the initial data load if a URI is specified.
        if( uri ) {
            var remote = this;
            var args = {
                url: uri, type: 'GET', dataType: 'json',
                success: function( data, status ) {
                    update( remote, ref, uri, status, 'GET', data, undefined );
                },
                error: function( xhr, status, err ) {
                    update( remote, ref, uri, status, 'GET', undefined, err );
                }
            };
            this.meta.status = 'loading'; this.meta.dataType = 'json';
            $.ajax( args );
        }
    };

    /**
     * Type for representing a remote data within the model.
     */
    RemoteMVCType.prototype = new BaseMVCType();
    function RemoteMVCType( methods, uri ) {
        this.init = function( frame, opts, value ) {
            return new Remote( frame.pathToFrame(), opts, methods, uri );
        };
        this.id = 'RemoteMVCType';
        this.initOnGet = true;
    };
    // Export constructor.
    $.nub.RemoteMVCType = RemoteMVCType;
    // Make available as standard type.
    $.nub.model.types.remote = new RemoteMVCType();

    /** Different nub configuration options. */
    $.nub.model.options = {
        /** The default context for relative data references. */
        globalContext: '/data',
        /** The attribute used to read data references from elements. */
        refAttr: 'data',
        /** Default function for testing whether an element is an input element. */
        isInput: function( elem ) { return !!elem.type && elem.type != 'button'; },
        /** Default function for reading a data reference from an element. */
        getRef: function( elem ) { return $(elem).attr( $.nub.model.options.refAttr ); },
        /** Default function for reading a data reference from an input element. */
        getInputRef: function( elem ) { return elem.name; },
        /** Resolve the format options for a node. */
        readFormatOptions: function( elem, fopts ) {
            return $.extend( {}, $.nub.model.options.formatOptions, fopts );
        },
        /** Default options for formatting (and parsing) MVC values. */
        formatOptions: {},
        /** The default 'change' event handler for input's registered with the model. */
        changeHandler: function( event ) {
            $.nub.set( this.name, $(this).val(), event.data[0], event.data[1] );
        },
        /** The default form input view function. */
        inputView: function( input, path, opt, op ) {
            $(input).val( $.nub.get( path, undefined, opt ) );
        },
        /** The default element view function. */
        elemView: function( elem, path, opt, op ) {
            $(elem).html( $.nub.get( path, undefined, opt ) );
        },
        /** The default attribute view function. */
        attrView: function( attr, path, opt, op ) {
            attr.value = $.nub.get( path, undefined, opt );
        },
        /** The default text node view function. */
        textView: function( text, path, opt, op ) {
            $(text).text( $.nub.get( path, undefined, opt ) );
        }
    };
    // If the metadata plugin is available then utilise it when reading an element's format options.
    if( $.metadata !== undefined ) {
        $.nub.model.options.readFormatOptions = function( elem, fopts ) {
            return $.extend( $.metadata.get( elem ), $.nub.model.options.formatOptions, fopts );
        }
    }

    /** Return a view for populating select lists. Source data must be either a 1D or 2D array. */
    function selectListView( elem, ref, context ) {
        var offset = elem.options.length; // Preserve any options already on the select list.
        return function() {
            var list = $.nub.get( ref, context );
            var i, j, len = list !== undefined ? list.length||0 : 0;
            // Populate the select list.
            for( i = 0, j = offset; i < len; i++, j++ ) {
                if( list[i] instanceof Array ) { // => [ value, label ]
                    elem.options[j] = new Option( list[i][1], list[i][0] );
                }
                else elem.options[j] = new Option( list[i] ); // => label only.
            }
            // Remove any used options.
            for( j = j; j < elem.options.length; j++ ) elem.options[j] = undefined;
        };
    };

    /** Read a model data reference from a node. */
    function getNodeRef( node ) {
        return node.getAttribute( $.nub.model.options.refAttr );
    };

    /** Promote an array containing a model data reference into a path. */
    function makePath( ref ) {
        ref.toString = function( i ) {
            return '/'+(isNaN( i ) ? this : this.slice( 0, i + 1 )).join('/');
        };
        ref.copy = function() {
            return makePath( this.slice( 0 ) );
        };
        ref.inContext = function( context ) {
            return makePath( context.split('/').concat( this ) );
        };
        ref.isModelPath = true;
        return ref;
    };

    /** Apply a type to a data reference. */
    function applyType( type, op, ref, rcontext, opts, opargs ) {
        if( typeof( type ) == 'string' ) {
            type = $.nub.model.types[type];
            if( type === undefined ) throw new Error("Unregistered type: "+type);
        }
        opts = opts||$.nub.model.options.formatOptions;
        return type.apply( op, ref, rcontext, opts, opargs );
    };

    /* Global MVC functions. */
    /** Turn a model data reference into a model path. */
    $.nub.path = function( ref, context ) {
        var path;
        if( ref === undefined || ref.isModelPath ) {
            path = ref;
        }
        else if( ref.nodeType ) {
            var refs = [];
            var accumRefs = function() {
                var nodeRef = getNodeRef( this );
                if( nodeRef !== null ) {
                    refs.unshift( nodeRef );
                    if( nodeRef.charAt( 0 ) == '/' ) throw true;
                }
            };
            try {
                accumRefs.apply( ref );
                $( ref ).parents().each( accumRefs );
            }
            catch( e ) {}
            path = makePath( ref );
        }
        else if( typeof( ref ) == 'string' ) {
            var refs = ref.split('/');
            // Strip empty path components from the end caused by trailing slashes.
            while( refs[refs.length - 1] == '' ) refs.length--;
            // Check for empty path component at start.
            if( refs[0] == '' ) {
                refs.shift();
                path = makePath( refs );
            }
            else {
                path = makePath( $.nub.path( context||$.nub.model.options.globalContext ).concat( refs ) );
            }
        }
        else if( $.isArray( ref ) ) {
            path = makePath( ref );
        }
        return path;
    };
    /** Get a referenced value. */
    $.nub.get = function( ref, context, opts ) {
        return applyType( $.nub.model.types.base, 'get', ref, context, opts );
    };
    /** Set a referenced value. */
    $.nub.set = function( ref, value, context, opts ) {
        return applyType( $.nub.model.types.base, 'set', ref, context, opts, [ value ] );
    };
    /** Delete a referenced value. */
    $.nub.del = function( ref, value, context, opts ) {
        return applyType( $.nub.model.types.base, 'del', ref, context, opts, [ value ] );
    };
    /** Notify registered views of changes to the model. */
    $.nub.notify = function( op, frame ) {
        var viewsPath = frame.pathToFrame().inContext('views');
        var views = $.nub.get( viewsPath );
        if( views ) {
            $.each( views, function( i, v ) {
                try {
                    // Mark the view as active before invoking (this prevents recursive loops
                    // when views have circular dependencies).
                    v.active = true;
                    // 0 = view fn, 1 = view fn OR view obj, 2 = data ref, 3 = options
                    v[0]( v[1], v[2], v[3], op );
                    v.active = false;
                }
                catch( e ) {
                    if( console !== undefined ) console.error("Notifying view: %o", e );
                }
            });
        }
    };
    /** Add a model view. 'obj' should be either a HTML node or a callback function. */
    $.nub.view = function( ref, obj, context, opt, noinit ) {
        var fn;
        if( $.isFunction( obj ) ) {
            fn = obj;
        }
        else if( obj.type ) { // Input
            fn = $.nub.model.options.inputView;
            // Select lists with a 'data' attribute load their option list from the MVC.
            if( obj.type == 'select-one' || obj.type == 'select-many' ) {
                var data = $(obj).attr('data');
                if( data ) {
                    // Add a view to populate the select list.
                    $.nub.view( data, selectListView( obj, data, context ), context, opt, noinit );
                }
            }
        }
        else switch( obj.nodeType ) {
            case 1: // Element
                fn = $.nub.model.options.elemView;
                break;
            case 2: // Attribute
                fn = $.nub.model.options.attrView;
                break;
            case 3: // Text
                fn = $.nub.model.options.textView;
                break;
            default: throw new Error("View must be a HTML element, attribute or text node, or a function");
        }
        var key = $.nub.path( ref, context );
        var view = [ fn, obj, key, opt ];
        var viewPath = key.inContext('views');
        $.nub.set( viewPath, view, undefined );

        // Invoke the callback to initialize the view.
        if( !noinit ) fn( obj, key, context, opt, 'set', undefined );
        return fn;
    };
    /** Add a view but don't initialize it by invoking it. */
    $.nub.addViewNoInit = function( ref, obj, context, opt ) {
        return $.nub.view( ref, obj, context, opt, true );
    };
    /** Remove a model view. */
    $.nub.removeView = function( ref, obj, context ) {
        var viewPath = $.nub.path( ref, context ).inContext('views');
        $.nub.del( viewPath, obj, undefined );
    };
    /** Register a form input with the model. */
    $.nub.addInput = function( node, context, opts ) {
        return $(node).bind('change', [ context, opts ], $.nub.model.options.changeHandler );
    };
    /** Add a type binding. */
    $.nub.type = function( ref, type, context ) {
        $.nub.model.types.base.bind( $.nub.path( ref, context ), type );
    };
    /**
     * Shortcut for creating a remote data type in the model.
     * The function can be called in two forms:
     * 1. $.nub.remote( path, uri, onupdate, bindings )
     * 2. $.nub.remote( options )
     * Available options for the second form are:
     * - path: Where in the model to bind the remote type (required). Will be resolved
               in the '/remote' context.
     * - uri:  The URI to initialy load data from.
     * - methods: serialize, onrequest and onload methods.
     * - bindings: A set of bindings to apply to the remote data.
     */
    $.nub.remote = function( pathOrOptions, uri, methods, bindings ) {
        var options;
        // Resolve options from the arguments.
        switch( typeof( pathOrOptions ) ) {
        case 'string':
            options = { path: pathOrOptions, uri: uri, methods: methods, bindings: bindings };
            break;
        case 'object':
            options = pathOrOptions;
            break;
        default:
            throw new Error("Invalid call to remote(): First arg must be a string or object");
        }
        // Bind the remote type.
        var type = new RemoteMVCType( options.methods, options.uri );
        $.nub.type( options.path, type, '/remote' );
        var cx = '/remote/'+options.path+'/data';
        for( var id in options.bindings ) {
            $.nub.type( id, options.bindings[id], cx );
        }
        return type;
    };
    /**
     * A function for inserting a data filter into the MVC model. A data filter observes
     * source data at another point in the model and applies its filter function whenever
     * that data changes, inserting the filter result into a specified model location.
     * The filter function is invoked as a method on the source data and can take arguments.
     * Arguments should be specified using the 'args' property of the data filter object.
     * Updating these arguments through the MVC will cause the filter function to be reapplied
     * to the source data with the updated arguments.
     * @filterRef:  The location of the data filter object in the model.
     * @dataRef:    The location of the filter's source data.
     * @filterFn:   The filter function.
     */
    $.nub.filter = function( filterRef, dataRef, filterFn ) {
        // Filter object -
        //  'args': arguments to the filter function.
        //  'result': the result returned by the filter function.
        var filter = { 'args':[], 'result':undefined };
        $.nub.set( filterRef, filter );
        // A functional view for invoking the filter function.
        function filterView() {
            var sourceData = $.nub.get( dataRef );
            var result = filterFn.apply( sourceData, $.nub.get('args', filterRef ) );
            $.nub.set('result', result, filterRef );
        }
        // Invoke the filter when the source data is updated.
        $.nub.addViewNoInit( dataRef, filterView );
        // Invoke the filter when the filter arguments change.
        $.nub.addViewNoInit('args', filterView, filterRef );
    };
    /**
     * Setup and destroy MVC view and input elements.
     * Methods:
     * - disable: Disable any MVC views associated with a set of elements.
     * - enable:  Re-enable any previously disabled MVC views associated with a set of elements.
     * - destroy: Deregister any MVC views associated with a set of elements.
     * Options: A single string argument not corresponding to a method name is used as an
     * MVC context path. Other options are:
     * - getRef: A function to read the data reference from an element.
     *   Defaults to getRef in the MVC model options.
     * - isInput: A function to test whether an element is an input element.
     *   Defaults to isInput in the MVC model options.
     * - getInputRef: A function to read the data reference from an input element.
     *   Defaults to getInputRef in the MVC model options.
     * - context:   A path providing a root context for all found references.
     * - formatOptions: A set of formatting options.
     * - readFormatOptions: A function for resolving the format options for an
     *   element. Defaults to readFormatOptions in the MVC model options.
     */
    $.fn.nub = function() {
        switch( typeof arguments[0] ) {
        case 'string':
            switch( arguments[0] ) {
            case 'disable':
                $(this).each( function() {
                    var $e = $(this);
                    if( $e.data('nub.ref') !== undefined ) {
                        $.nub.removeView( $e.data('nub.ref'), $e.data('nub.view'), $e.data('nub.context') );
                    }
                });
                return this;
            case 'enable':
                $(this).each( function() {
                    var $e = $(this);
                    if( $e.data('nub.ref') !== undefined ) {
                        $.nub.view( $e.data('nub.ref'), $e.data('nub.view'), $e.data('nub.context') );
                    }
                });
                return this;
            case 'destroy':
                $(this).each( function() {
                    var $e = $(this);
                    if( $e.data('nub.ref') !== undefined ) {
                        $.nub.removeView( $e.data('nub.ref'), $e.data('nub.view'), $e.data('nub.context') );
                    }
                    $e.removeData('nub.ref');
                    $e.removeData('nub.view');
                    $e.removeData('nub.context');
                });
                return this;
            default:
                // Argument is a path context.
                var options = $.extend( { context: arguments[0] }, $.nub.model.options );
            }
            break;
        case 'object':
        case 'undefined':
            var options = $.extend( {}, $.nub.model.options, arguments[0] );
            break;
        default:
            throw new Error("Bad argument passed to nub(): "+arguments[0]);
        }
        $(this).each( function() {
            if( options.isInput( this ) ) {
                var fopts = options.readFormatOptions( this, options.formatOptions );
                var ref = options.getInputRef( this );
                var view = $.nub.view( ref, this, options.context, fopts );
                $.nub.addInput( this, options.context, fopts );
            }
            else {
                var ref = options.getRef( this );
                if( ref !== undefined ) {
                    var fopts = options.readFormatOptions( this, options.formatOptions );
                    var view = $.nub.view( ref, this, options.context, fopts );
                }
            }
            $(this).data('nub.context', options.context );
            $(this).data('nub.ref', ref );
            $(this).data('nub.view', view );
        });
        return this;
    };
})(jQuery);
