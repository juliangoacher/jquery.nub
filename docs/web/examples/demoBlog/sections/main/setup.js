function(){
    console.log('Running main section js code.');
    var post = $.nub.get('/data/post-pool');
    console.log(post);

    $('[data]').nub('/data/post-pool/1');
    
}