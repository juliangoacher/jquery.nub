$.mvc.Template = function( template ) {
    // Tokenize the template string.
    function tokenize( s ) {
        for( var i = 0, j = 0, ts = []; i < s.length; i++ ) {
            var ch = s.charAt( i );
            if( tokens[ch] ) {
                var r = tokens[ch].pattern.exec( s.substring( i + 1 ) );
                if( r ) {
                    ts.push( s.substring( j, i ) );
                    ts.push( tokens[ch].make( r ) );
                    j = (i += r[0].length) + 1;
                }
            }
        }
        ts.push( s.substring( j, i ) );
        return ts;
    }
    // Token types.
    var tokens = {
        '{': {  // Start of a control token.
            pattern: /(\/?\w+)\s*([^}]*)\}/,
            make: function( r ) {
                return { type: r[1], expr:r[2]||'' };
            }
        },
        '$': {  // Start of a reference token.
            pattern: /^(\{(\w+:)?([^}]+)\}|(\w+:)?([-_\w\/]+))/,
            make: function( r ) {
                //return { type: '_ref', expr: r[2], qualifier: r[1] };
                return r[3]
                    ? { type: '_ref', expr: r[3], qualifier: r[2] }
                    : { type: '_ref', expr: r[5], qualifier: r[3] };
            }
        }
    };
    // Compile an array of tokens.
    function compile( i, ts, prev, expr ) {
        var c = [], t = ts[i], curr, next = structs._stop;
        for( i = i; i < ts.length; i++ ) {
            t = ts[i];
            if( typeof t == 'string' ) {
                if( t.length > 0 ) {
                    c.push( structs._str.make( t ) );
                }
            }
            else if( t.type == '_ref' ) {
                var ref;
                switch( t.qualifier ) {
                case 'local:': ref = structs._local.make( t ); break;
                case 'bare:':  ref = structs._bare.make( t ); break;
                default:       ref = structs._ref.make( t );
                }
                c.push( ref );
            }
            else if( prev.next[t.type] ) {
                curr = structs[prev.next[t.type]];
                if( !curr.stop ) {
                    next = compile( i + 1, ts, curr, curr.expr( t ) );
                    i = next.i;
                }
                break;
            }
            else {
                curr = structs[t.type];
                if( !curr ) {
                    throw new Error("Bad token: "+t.type);
                }
                else if( curr.open ) {
                    var block = compile( i + 1, ts, curr, curr.expr( t ) );
                    i = block.i;
                    c.push( block.f );
                }
                else throw new Error("Misplaced token: "+t.type);
            }
        }
        return { i: i, f: prev.make( expr, structs._block.make( c ), next.f ) };
    }
    // Evaluation context.
    Context.prototype.getLocal = function( n ) {
        var v = this.ls[n];
        switch( typeof v ) {
        case 'function':  return v( this );
        case 'undefined': return '';
        default:          return v;
        }
    };
    Context.prototype.getBare = function( n ) {
        return $.mvc.get( n, this.cx, { bare: true } );
    };
    function Context( cx, ls, opts, $elem, parent ) {
        this.cx = cx; this.ls = ls||{}; this.opts = opts; this.$elem = $elem; this.parent = parent;
    }
    // Control structures.
    var structs = {
        '_top': {
            make: function( expr, cont, next ) {
                return function( cx ) {
                    return [].concat( cont( cx ) ).concat( next( cx ) ).join('');
                }
            },
            expr: $.mvc.noop,
            next: {}
        },
        'if': {
            open: true,
            make: function( expr, cont, next ) {
                return function( cx ) {
                    return expr( cx ) ? cont( cx ) : next( cx );
                }
            },
            expr: function( t ) {
                var expr = t.expr
                                .replace(/\$local:([\w\/]+)/g,"cx.getLocal('$1')")
                                .replace(/\$bare:([\w\/]+)/g,"cx.getBare('$1')")
                                .replace(/\$([\w\/]+)/g,"$.mvc.get('$1',cx.cx,cx.opts)");
                return new Function('cx','return !!('+expr+');');
            },
            next: { '/if':'_close', 'elseif':'if', 'else':'else' }
        },
        'else': {
            make: function( expr, cont, next ) {
                return function( cx ) {
                    return cont( cx );
                }
            },
            expr: $.mvc.noop,
            next: { '/if':'_close', '/foreach':'_close' }
        },
        'foreach': {
            open: true,
            make: function( expr, cont, next ) {
                return function( cx ) {
                    var lcx = expr( cx );
                    var len = $.mvc.get('length', lcx );
                    if( len > 0 ) {
                        var ls = $.extend( {}, cx.ls );
                        var _cx = new Context( undefined, ls, cx.opts, cx.$elem, cx );
                        for( var i = 0, s = []; i < len; i++ ) {
                            _cx.ls.idx = i;
                            _cx.cx = lcx+'/'+i;
                            s = s.concat( cont( _cx ) );
                        }
                        return s;
                    }
                    return next( cx );
                }
            },
            expr: function( t ) {
                return function( cx ) {
                    return cx.cx+'/'+t.expr;
                };
            },
            next: { '/foreach':'_close', 'else':'else' }
        },
        '_close': {
            expr: $.mvc.noop,
            stop: true
        },
        '_block': {
            make: function( expr ) {
                var t = expr;
                return function( cx ) {
                    for( var i = 0, s = []; i < t.length; i++ ) {
                        s = s.concat( t[i]( cx ) );
                    }
                    return s;
                }
            }
        },
        '_ref': {
            make: function( expr ) {
                return function( cx ) {
                    return $.mvc.get( expr.expr, cx.cx, cx.opts );
                }
            }
        },
        '_local': {
            make: function( expr ) {
                return function( cx ) {
                    var ls = cx.ls;
                    if( ls ) {
                        switch( typeof ls[expr.expr] ) {
                        case 'undefined': return '';
                        case 'function':  return ls[expr.expr]( cx );
                        default:          return ls[expr.expr];
                        }
                    }
                }
            }
        },
        '_bare': {
            make: function( expr ) {
                return function( cx ) {
                    return $.mvc.get( expr.expr, cx.cx, { bare: true } );
                }
            }
        },
        '_str': {
            make: function( expr ) {
                return function( cx ) {
                    return expr;
                }
            }
        },
        '_stop': { f: function() { return []; } }
    };
    var resolve = compile( 0, tokenize( template ), structs._top, $.mvc.noop ).f;
    this.resolve = function( mvcContext, locals, formatOpts, $elem ) {
        return resolve( new Context( mvcContext, locals, formatOpts, $elem ) );
    };
}
/**
 * Bind a template to an HTML element.
 * Methods:
 * - view: Return the template's view function.
 * - get: Get the template.
 * - set: Set the template.
 * - disableRefresh: Stop the template refreshing after MVC updates.
 * - enableRefresh: Undo the effect of disableRefesh.
 * - destroy: Remove all template hooks.
 * Options:
 * - uri: The URI of the template file (Requried).
 * - ref: The template data's MVC reference (Optional).
 * - context: An MVC path context.
 * - onload: A function to invoke when the template result is inserted into the DOM.
 * - onunload: A function to invoke when the template result is removed from the DOM.
 * - locals: Local template variables and functions.
 * - formatOptions: MVC value formatting options.
 */
$.fn.mvcTemplate = function() {
    if( typeof arguments[0] == 'string' ) {
        var cmd = arguments[0];
        var $elem = $(this);
        switch( cmd ) {
        case 'destroy':
            var view = $elem.data('mvcTemplate.view');
            $.mvc.removeView( $elem.data('mvcTemplate.ref'), view );
            if( $elem.data('mvcTemplate.dataRef') ) {
                $.mvc.removeView( $elem.data('mvcTemplate.dataRef'), view );
            }
            return this;
        case 'disableRefresh':
            $.mvc.set('data/refresh', false, $elem.data('mvcTemplate.ref') );
            return this;
        case 'enableRefresh':
            $.mvc.set('data/refresh', true, $elem.data('mvcTemplate.ref') );
            if( arguments[1] ) $elem.data('mvcTemplate.refresh')( true );
            return this;
        case 'refresh':
            $elem.data('mvcTemplate.refresh')( true );
            return this;
        case 'view':
            return $elem.data('mvcTemplate.view');
        case 'get':
            return $.mvc.get( $elem.data('mvcTemplate.ref') );
        case 'set':
            $.mvc.set( $elem.data('mvcTemplate.ref', arguments[1] ) );
            return tref;
        default: throw new Error('Unrecognised mvcTemplate method: '+opts);
        }
    }
    var opts = arguments[0]||{};
    // Check that a template URI has been specified.
    var uri = opts.uri;
    if( !uri ) throw new Error("Template URI not specified");
    // Path to the template instance in the mvc.
    var tref = '/data/mvc-template/'+encodeURIComponent( uri );
    // Load the template and store in the model.
    $.mvc.get( tref ).lazyLoad( uri );

    var onload = opts.onload||$.mvc.noop, onunload = opts.onunload||$.mvc.noop;
    return $(this).each( function() {
        var elem = this, $elem = $(this);
        // Resolve a data reference.
        var ref = $.mvc.path(opts.ref||$elem.attr('data'),opts.context);
        function refresh( force ) {
            var template = $.mvc.get( tref );
            if( template.data === undefined ) return; // template not loaded
            if( template.data && force||template.data.refresh ) {
                onunload( elem );
                $elem.html( template.data.resolve( ref, opts.locals, opts.formatOptions, $elem ) );
                window.setTimeout( function() { onload( elem ); }, 0 );
            }
        }
        function view() { refresh(); }
        $elem.data('mvcTemplate.refresh', refresh );
        $elem.data('mvcTemplate.view', view );
        $elem.data('mvcTemplate.ref', tref );
        $elem.data('mvcTemplate.dataRef', ref );
        if( ref !== undefined && !opts.disableRefresh ) $.mvc.addView( ref, view );
        $.mvc.addView( tref, view );
    });
};
$.mvc.addTypeBinding('/data/mvc-template/*', new $.mvc.RemoteMVCType({
    afterLoad: function( remote, method ) {
        var template = new $.mvc.Template( remote.data );
        template.refresh = true;
        remote.data = template;
        return remote;
    }
}));
