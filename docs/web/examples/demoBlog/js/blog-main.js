/* 
 * Main blog javascript code. This code will be run on the index.html html and is used for the main
 * application setup initalization and startup.
 */

var postNumber = 0;
var username = 'user';
var pass = 'pass'
//var blogConfig = {
// 'blog-tile : 'Demo app blog.'
//}

function initBlog(){
    console.log('Initializing blog UI.');
    createBlogMenu();

    // Show main section. Set the value in the contentKeyRef
    //  Default value : data + elementID
    // $.nub.set('/data/contentKeyRef', 'main');
    $.nub.set('/data/blog-main-menu', 'main');
    $.nub.set('/data/post/postNumber', '0');

    var refreshMain = function(){
        console.warn('refresh');
        var sectionKey = $.nub.get('/data/blog-main-menu');
        console.warn('key %s',sectionKey);
        switch(sectionKey){
            case 'main': {
                // Read the posts and add to the main section page
                var postPool = $.nub.get('/data/post-pool/');
                for(i in postPool){
                    var post = postPool[i];
                    var html = '<div><p>Title: '+post.title+'</p><p>Post : ' + post.content + '</p></div>';
                    $('#posts').append(html);
                }
                break;
            }
            case 'admin' : {
                 $('#last-post').hide();
            }
            break;
        }

    }
    /// Add a view for the main refresh
    $.nub.view('/data/blog-main-menu',refreshMain);

}


function createBlogMenu(){
    var rootPackage = 'sections/'

    $('#blog-main-menu').nubDynamicMenu({
        'frame' : {
            //'contentKeyRef' : '/data/contentKeyRef',
            'makeLayoutURI' : function(key){
                console.log('muels');
                console.log('layout : ' + 'sections/' + key + '/main.html');
                return 'sections/' + key + '/main.html';
            },
            'makeSetupURI' : function(key){
                console.log('muels');
                return 'sections/' + key + '/setup.js';
            }
        }
    });
}


