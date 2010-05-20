function(){
    var postPoolPath = '/data/post-pool/';
    var postArray = [];

    populatePost(4);
    $.nub.set('/data/admin-section-cid','new-post'); //Show 'new-post' section.

    // Register the select list.
    $(':input').nub('/data');
    $('[data]').nub('/data');

    // See that list has a 'name' attribute, this can be used to setup list values.
    //$.nub.set('/data/color-list', ['sub-section', 'sub-section']);

    // Define the switched menu. The keyRef has to be in the same location than the list name attibute.
    $('#admin-switched-menu').nubFrame({
        'frame' : new $.nub.frames.SwitchedHTMLFrame({'cid' : 'id'}),
        'keyRef' : '/data/admin-section-cid'
    })
    
    $('#delete-all-posts').click(function(event){
        postArray = [];
        // TODO : Explain this in documentation, improve code, warning?
        // Nub views has to be destroy before the object is deleted!
        $('[data]').nub('destroy');
        $.nub.del(postPoolPath, {});
    });
    
    $('#post-entry').click(function(event){
        //console.log('Posting blog...');
        savePost();
    });
    
    // Records a post in the model.
    function savePost(){
        console.log('save post');
        var post = {
            dateTime    : getCurrentDate(),
            title   : $.nub.get('/data/post/title'),
            content :  $.nub.get('/data/post/content')
        }
        
        postArray.push(post);
        $.nub.set(postPoolPath, postArray);

        // Show last post info
        $.nub.set('/data/latest-post', post);
        //$('span,[data]').nub('/data/latest-post/');
        $('#last-post [data]').nub('/data/latest-post');
        $('#last-post').show();
        resetForm();
    }
    
    // Populate some demo post.  
    function populatePost(maxPost){
        console.log('COOO populate post');
        for(var i=1;i<maxPost;i++){
            var post = {
                dateTime    : getCurrentDate(),
                title   : 'Post number '+ i,
                content :  'This is an auto-generated.' 
            }
            postArray.push(post);
        }
        $.nub.set(postPoolPath, postArray);
    }

    function getCurrentDate(){
        var d = new Date();
        var date = d.getDate();
        var month = d.getMonth();
        var year = d.getFullYear();
        var hour = d.getHours();
        var min = d.getMinutes();

        var dateTime = {
            'date' : date + '/' + month + '/' + year,
            'time' : hour + ':' + min
        }
        return dateTime;
    }

    function resetForm(){
        $.nub.set('/data/post/title','');
        $.nub.set('/data/post/content','');
    }
}
