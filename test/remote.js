/** Nub remote functionality tests. */
(function($) {

    module('Nub: remote');

    test('Loading data using remote', function() {

        expect( 6 );

        $.nub.remote('test');
        var remote = $.nub.get('/remote/test');

        // Test remote object's initial state.
        ok( remote.meta !== undefined, "Remote object has a 'meta' property");
        ok( remote.data === undefined, "Remote object has undefined 'data' property");
        equals( $.nub.get('/remote/test/meta/status'),'preload',"Remote object has 'preload' status");

        // Test loading data.
        stop();
        function testView1() {
            var status = $.nub.get('/remote/test/meta/status');
            switch( status ) {
            case 'preload':
                break; // Initial view registration callback.
            case 'loading':
                break; // Ignore, expected transitional status.
            case 'loaded':
                ok( true, "Remote object has 'loaded' status");
                equals( $.nub.get('/remote/test/data/value'), 100, "Remote data has property 'value=100'");
                ok( /test-data.json$/.test( $.nub.get('/remote/test/meta/uri') ),
                                            "Remote URI references file 'test-data.json'");
                // Cleanup
                $.nub.removeView('remote/test', testView1 );
                start();
                break;
            default:
                ok( false, "Remote object has unexpected status: "+status);
            }
        };
        $.nub.view('/remote/test', testView1 );
        remote.get('test-data.json');

    });

})(jQuery);
