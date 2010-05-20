(function($) {
    function Table( opts, tableRef, dataRef, elem ) {

        this.elem = elem;                       // The TABLE element.
        this.page = 1;                          // The number of the page being displayed.
        var table = this;
        var ttr = elem.tBodies[0].rows[0];      // The 'template' row.
        var idRef = $(ttr).attr('data-id');     // Reference to the row ID.
        var tdRefs = [];                        // Array of table cell data references.
        var tdSetFns = [];                      // Array of functions for rendering table cell contents.

        function setText( td, data ) { $(td).text( data ); }

        // Record data refs for each table cell.
        for( var i = 0; i < ttr.cells.length; i++ ) {
            tdRefs[i] = $(ttr.cells[i]).attr('data');
            tdSetFns[i] = setText;
        }

        // Copy the table row to produce a table of 20 rows.
        opts.initRow( ttr, 0 );                             // init first row
        // 'elem.rows.length' takes account of any header rows.
        var offset = elem.rows.length - 1;
        for( var i = 1; i < opts.rowCount; i++ ) {
            var ntr = elem.insertRow( offset + i );         // insert new row
            ntr.className = ttr.className;                  // copy default row css class
            opts.initRow( ntr, i );                         // init new row
            for( var j = 0; j < ttr.cells.length; j++ ) {   // add cells to new row
                ntr.insertCell( j ).className = ttr.cells[j].className;
            }
        }

        // Attach event handlers to table rows.
        var rows = elem.tBodies[0].rows;
        for( i = 0; i < rows.length; i++ ) {
            var $tr = $(rows[i]);
            if( opts.click || opts.selectClass ) {     // attach click handler
                $tr.click( function() {
                    var row = $(this);
                    if( table.selected && opts.selectClass ) {
                        table.selected.removeClass( opts.selectClass );
                    }
                    table.selected = row;
                    if( opts.selectClass ) {
                        table.selected.addClass( opts.selectClass );
                    }
                    table.selectedId = row.data('data-id');
                    if( opts.click ) {
                        opts.click( table.selectedId, i );
                    }
                });
            }
            if( opts.hoverClass ) {                         // attach mouse over
                $tr.hover(
                    function() { $(this).addClass( opts.hoverClass ) },
                    function() { $(this).removeClass( opts.hoverClass ) }
                );
            }
        }

        // Set the function used to render a cell's contents.
        this.setCellRenderFn = function( i, fn ) {
            tdSetFns[i] = fn;
            this.redraw();
        }

        // Add a view to populate the table.
        this.redraw = function() {
            var i, r, len = $.mvc.get('length', dataRef )||0;
            // Update the last page number.
            $.mvc.set('lastPage', Math.floor( (len / opts.rowCount) + 1 ), tableRef );
            // Clear selected row, if any.
            if( table.selected && opts.selectClass ) {
                table.selected.removeClass( opts.selectClass );
            }
            // Populate all rows with available data.
            for( i = 0, r = ((table.page - 1) * opts.rowCount); i < opts.rowCount && r < len; i++, r++ ) {
                var dtr = rows[i], $dtr = $(dtr);
                // If an idRef is defined then use it else use the row index.
                var id = idRef !== undefined ? $.mvc.get( r+'/'+idRef, dataRef ) : i;
                $dtr.data('data-id', id );
                // Populate row data.
                for( var j = 0; j < dtr.cells.length; j++ ) {
                    var data = $.mvc.get( r+'/'+tdRefs[j], dataRef, opts.formatOptions );
                    tdSetFns[j]( dtr.cells[j], data );
                }

                // Check for selected row, mark as selected if found.
                if( table.selectedId == id ) {
                    table.selected = $dtr;
                    if( opts.selectClass ) {
                        $dtr.addClass( opts.selectClass );
                    }
                }
                if( opts.hideEmptyRows ) dtr.style.visibility = 'visible';
            }
            // Clear any rows with no data available.
            for( i = i; i < opts.rowCount; i++ ) {
                var dtr = rows[i];
                for( var j = 0; j < dtr.cells.length; j++ ) {
                    $(dtr.cells[j]).html('&nbsp;');
                }
                if( opts.hideEmptyRows ) dtr.style.visibility = 'hidden';
            }
        };
    }

/*
    function divTable( opts, parent ) {
        opts = $.extend( {
            rowSelector: '*.table-row',
            emptyListSelector: '*.empty-list-message'
        }, opts );
        var table = this;
        var dataRef = $(parent).attr('data');
        if( !dataRef ) throw new Error("Table has no 'data' attribute");
        // Select the row template.
        var firstRow = $( opts.rowSelector )[0];
        if( firstRow === undefined ) throw new Error("Table row template not found");
        firstRow.style.visibility = 'hidden';
        // Instantiate the list rows.
        this.rows = [ firstRow ];
        for( var i = 1; i < opts.rowCount; i++ ) {
            var row = firstRow.clone( true );   // Clone the template element.
            row.style.visibility = 'hidden';    // Hide the the new row.
            parent.appendChild( row );          // Append the new row to the table parent element.
            rows.push( row );                   // Add the new row to the rows collection.
        }
        // Perform rest of initialization after DOM is rendered.
        window.setTimeout( function() {
            for( var i = 0; i < table.rows.length; i++ ) {
                $(table.rows[i]).mvcRegister( dataRef+'/'+i );
            }
        }, 0 );
        // Select the element displayed when the list is empty.
        this.$empty = $( opts.emptyListSelector );
        this.$empty.hide();
    }
    */

    // Alt text labels for pager icons.
    var pagerIconAltText = { first:'First page', prev:'Previous page', next:'Next page', last:'Last page' };
    // Click callback functions for page icons.
    var pagerIconClickFns = {
        first: function( tableRef ) {
            return function() { $.mvc.set('page', 1, tableRef ) };
        },
        prev: function( tableRef ) {
            return function() {
                var page = $.mvc.get('page', tableRef );
                if( page > 0 ) {
                    $.mvc.set('page', page - 1, tableRef );
                }
            }
        },
        next: function( tableRef ) {
            return function() {
                var page = $.mvc.get('page', tableRef );
                var last = $.mvc.get('lastPage', tableRef );
                if( page < last ) {
                    $.mvc.set('page', page + 1, tableRef );
                }
            };
        },
        last: function( tableRef ) {
            return function() {
                $.mvc.set('page', $.mvc.get('lastPage', tableRef ), tableRef );
            };
        }
    }
    // Make a pager icon and append to a parent node.
    function makePagerIcon( parent, id ) {
        var icon = document.createElement('img');
        icon.src = 'images/'+id+'.png';
        icon.alt = icon.title = pagerIconAltText[id];
        var $icon = $( parent.appendChild( icon ) );
        $icon.addClass('table-footer-'+id).click( pagerIconClickFns[id] );
        return $icon;
    }

    // Build a table paging footer.
    function makePager( table, tableRef ) {
        var footer = document.createElement('div');
        footer.className = 'table-footer';
        var form = footer.appendChild( document.createElement('form') );

        makePagerIcon( form, 'first');
        makePagerIcon( form, 'prev');

        var page = $( form.appendChild( document.createElement('input') ) );
        page.addClass('table-footer-page').attr('size','2').change( function() {
            var p = Number( $(this).val() );
            if( p != Number.NaN ) {
                $.mvc.set('page', p, tableRef );
            }
            else {
                $(this).val( $.mvc.get('page', tableRef ) );
            }
        });
        $.mvc.addView('page', function() {
            page.val( $.mvc.get('page', tableRef ) );
        }, tableRef );

        form.appendChild( document.createTextNode(' / ') );
        $.mvc.addView('lastPage', form.appendChild( document.createElement('span') ), tableRef );

        makePagerIcon( form, 'next');
        makePagerIcon( form, 'last');
        table.elem.parentNode.insertBefore( footer, table.elem.nextSibling );
    }
    $.fn.ifTable = function( opts ) {
        opts = $.extend( {}, {
            rowCount: 20,
            initRow: $.mvc.noop,
            pager: true,
            hideEmptyRows: true
        }, opts );
        var table;
        $(this).each( function() {
            var tableRef = '/table/'+$.data( this );
            // Read the table's data reference.
            var rowRef = $(this).attr('data');
            // Instantiate the table object.
            if( this.tagName == 'TABLE' ) {
                table = new Table( opts, tableRef, rowRef, this );
                // Setup views etc.
                $.mvc.set( tableRef, table );
                $.mvc.addView( rowRef, table.redraw );
                $.mvc.addView('page', table.redraw, tableRef );
                if( opts.pager ) {
                    makePager( table, tableRef );
                }
            }
        });
        return table;
    };
})(jQuery);
