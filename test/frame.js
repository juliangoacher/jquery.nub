/** Nub frame functionality tests. */
(function($) {

    module('Nub: frame');

    test('SwitchedHTMLFrame', function() {
        expect( );

        $('#switched-frame').nubFrame({
            frame: new $.nub.frames.SwitchedHTMLFrame(),
            keyRef: '/data/switched-frame-ck'
        });
        
        function testState( state ) {
            var result = '';
            $('#switched-frame div').each(function() {
                result += $(this).is(':visible') ? 1 : 0;
            });
            var key = $.nub.get('/data/switched-frame-ck');
            same( result, state, "Visible frame content for content key '"+key+"'");
        };

        testState('001');
        $.nub.set('/data/switched-frame-ck','sw1');
        testState('100');
        $.nub.set('/data/switched-frame-ck','sw2');
        testState('010');
        $.nub.set('/data/switched-frame-ck','xxx');
        testState('001');

    });

})(jQuery);
