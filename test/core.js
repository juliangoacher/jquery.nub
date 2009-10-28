/** Core Nub MVC tests. */
(function($) {

    module('Nub: core');

    test('Basic getting, setting and deleting', function() {
        expect( 3 );
        equals( $.nub.get('/data/test'), undefined, "/data/test is undefined");
        $.nub.set('/data/test', 100 );
        equals( $.nub.get('/data/test'), 100, "/data/test equals '100' after 'set' op");
        $.nub.del('/data/test');
        equals( $.nub.get('/data/test'), undefined, "/data/test is undefined after 'del' op");
    });

    test('Basic getting, setting and deleting with context path', function() {
        expect( 3 );
        var cx = '/data';
        equals( $.nub.get('test', cx ), undefined, "/data/test is undefined");
        $.nub.set('test', 100, cx );
        equals( $.nub.get('test', cx ), 100, "/data/test equals '100' after 'set' op");
        $.nub.del('test', cx );
        equals( $.nub.get('test', cx ), undefined, "/data/test is undefined after 'del' op");
    });

    function initResult() { return { value: undefined, invoked: false }; }

    test('Basic view functionality', function() {
        expect( 6 );
        var result = initResult();
        var view = function() {
            result.invoked = true;
            result.value = $.nub.get('/data/test/value');
        };
        $.nub.view('/data/test/value', view );
        // Test direct set.
        $.nub.set('/data/test/value', 100 );
        ok( result.invoked, "View invoked after '/data/test/value' set");
        equals( result.value, 100, "View gets '100' from '/data/test/value'");
        // Test parent set.
        result = initResult();
        $.nub.set('/data/test', { value:'abc' } );
        ok( result.invoked, "View invoked after '/data/test' set");
        equals( result.value, 'abc', "View reads 'abc' from '/data/test'");
        // Test view isn't invoked when setting other parts of the model.
        result = initResult();
        $.nub.set('/data/other', 100 );
        ok( !result.invoked, "View not invoked for update of non-observed value");
        // Test view removal.
        $.nub.removeView('/data/test/value', view );
        result = initResult();
        $.nub.set('/data/test','xyz');
        ok( !result.invoked, "View not invoked after removal");
    });

    test('Multiple views', function() {
        expect( 1 );
        var result = [];
        $.nub.view('/data/test/value', function() { result[0] = true; } );
        $.nub.view('/data/test/value', function() { result[1] = true; } );
        $.nub.view('/data/test', function() { result[2] = true; } );
        $.nub.set('/data/test', { value: 23 } );
        // Confirm that 'result' has 3 items, all true.
        ok( result[0] && result[1] && result[2], "All views invoked after update");
    });

    test('nub() function, registering view elements', function() {
        expect( 2 );
        var value = 'This and That';
        $.nub.set('/data/test', value );
        $('.view-test-1').nub();
        equals( $('#view1').text(), value, "View element displays the correct value");
        equals( $('#input1').val(), value, "Input element displays the correct value");
    });

    test('nub() function, registering select lists', function() {
        expect( 3 );
        $('.view-test-2').nub();
        $.nub.set('/data/list', [ ['1','One'],['2','Two'],['3','Three'] ]);
        $.nub.set('/data/test', '2');
        var select = $('#select1').get(0);
        equals( $(select.options[0]).text(), 'Default', "Select element has default option");
        equals( select.options.length, 4, "Select has all options");
        var idx = select.selectedIndex;
        equals( $(select.options[idx]).val(), '2', "Selected value is correct");
    });

})(jQuery);
