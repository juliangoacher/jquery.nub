function(){
    $('#last-post').hide();
    var post = {
        date : '',
        author : '',
        title : '',
        content : ''
    }

    $.nub.set('/data/admin-section-cid','new-post'); //Show 'new-post' section.
    //$('[data]').nub('/data/post-pool/1');

    // Register the select list. T
    $('select,:input').nub('/data');
    $('[data]').nub('/data');

    //$.nub.set('/data/admin-switched-menu',['Orange','Mauve','Brown','Black']);

    // Define the switched menu. The keyRef has to be the same location the list name attibute.
    $('#admin-switched-menu').nubFrame({
        'frame' : new $.nub.frames.SwitchedHTMLFrame({'cid' : 'id'}),
        'keyRef' : '/data/admin-section-cid'
    })

    $('#post-entry').click(function(event){

        console.log('Posting blog...');
        var postNum = $.nub.get('/data/post/postNumber');
        postNum = parseInt(postNum) + 1;
        $.nub.set('/data/post/postNumber', postNum);

        var post = {
            dateTime    : getCurrentDate(),
            author  : getUserName(),
            title   : $.nub.get('/data/post/title'),
            content :  $.nub.get('/data/post/content')
        }
        // Save the data
        var postPath = '/data/post-pool/'+postNum;

        console.log('Posting %s %s - postNumber %s', post.title, post.content, postPath);

        $.nub.set(postPath, post); // Store the post in the model
        $.nub.set('/data/latest-post', post);
       
        // Show latest post.
        //var html = ' <div>Title:<spam data="title"></spam> Post : <spam data="content"></spam></div>';
        //var html = 'Latest Post:<div><p>Title: '+post.title+'</p><p>Post : ' + post.content + '</p></div>';
        //$('#lastest-post').html(html);

        resetForm();
        // Register the views context
        $('span,[data]').nub('/data/post-pool/' + postNum);
        // Show latest post
        $('#last-post').show();
        
    });

    function getUserName(){
        return $.nub.get('/data/user/username');
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
        console.log('Date : %o',dateTime);
        return dateTime;
    }
    function resetForm(){
        $.nub.set('/data/post/title','');
        $.nub.set('/data/post/content','');
    }
}