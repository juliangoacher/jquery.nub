/** Nub frame functionality tests cases. */
(function($) {

    module('Nub: menu');

    function resetFrameElement(){
        $('#dynamic-menu-frame').replaceWith('<div id="dynamic-menu-frame">Frame:</div>');
    }
    // Test Dynamic Menu with a set of pre-configured values.
    test('DynamicMenuConfiguration', function(){
        expect( );
        // Test Dynamic Menu with default values.
        var frame = $('#dynamic-menu').nubDynamicMenu();
        // Check default values
        $.nub.set('/data/contentKeyRef', 'section1');
        same(frame, $('#dynamic-menu-frame'),"Create dynamic frame for menu with defaults configuration");
        // TODO : Reset element
        resetFrameElement();
        
        // Simple Dyamic Menu test : Read data from url : data/section1...
        var frame = $('#dynamic-menu').nubDynamicMenu({
            'frame' : {
                'contentKeyRef' : '/data/contentKeyRef',
                'makeLayoutURI' : function( key ){
                    var path = 'data/' + key + '/main.html';
                    console.log('setting the path to ... ' +path );
                    return path;
                }
            },
            'frameLookup' : function(menuItem){
                console.log("frameLookup : " +  menuItem.attr('id') + '-frame');
                return $('#' + menuItem.attr('id') + '-frame');
            }
        });

        function testSection( section ){
            $.nub.set('/data/contentKeyRef', section);
            var temp = $.nub.get('/data/contentKeyRef');
            same(frame, $('#dynamic-menu-frame'),"Dynamic Frame to show menu's section created");
            // TODO: How to test dynamic frames ??
            console.log("Frame html: %o", $('#dynamic-menu-frame').html());// div element is empty
        }

        testSection("section1");
        //$.nub.set('/data/contentKeyRef', 'section2');
        //testSection("section1");
    });

})(jQuery);
