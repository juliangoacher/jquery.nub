/* 
 * blog-main.js : Main blog js file.
 *
 * Simple blog using jquery.nub.
 *
 * This code will be run on the index.html and is used for the main
 * application setup initalization and startup.
 *
 * @author : Javier Loriente
 *
 *
 */

// GLOBAL VARIABLES : Can be accessed from the section packages setup.
//var postNumber = 0;

// Represent a blog user.
var user = {
    date : '', // Customer account date creation
    username : 'noname',
    pass : 'noname'
}
var blogConfig = {
   'blog-title' : 'Demo app blog.',
   'blog-about' : 'Example of a blog creation using jquery.nub and nub.frames'
}
var context;
function initBlog(){
    
    // Define Main blog menu
    $('#blog-main-menu').nubDynamicMenu({
        'frame' : {
            //'contentKeyRef' : '/data/contentKeyRef',
            'makeLayoutURI' : function(key){
                return 'sections/' + key + '/main.html';
            },
            'makeSetupURI' : function(key){
                return 'sections/' + key + '/setup.js';
            }
        }
    });

    $.nub.set('/data/blog-main-menu', 'admin');
    $.nub.set('/data/blog-main-menu', 'main');

    var refreshSection = function(){
        var sectionKey = $.nub.get('/data/blog-main-menu');
        console.log('refresing section : %s', sectionKey);
        switch(sectionKey){
            case 'main': {
                addPostsLoadingTemplate();
                break;
            }
            case 'admin' : {
                $('#last-post').hide();
                break;
            }
        }

    }

    // Resister view with menu key. 
    $.nub.view('/data/blog-main-menu',refreshSection);
}

// A simple possible solution to show post is to create an html element per post
// and append those :mnto the main post element.
function addPostToMainSection(){
     // Read the posts and add to the main section page
    var postPool = $.nub.get('/data/post-pool/');
    for(i in postPool){
        var post = postPool[i];
        var html = '<div class="post">\n\
            <p>Title: '+ post.title +'</p>\n\
            <p>Post : ' + post.content + '</p>\n\
            <spam>' + post.dateTime.time + ' ' + post.dateTime.date + '</spam></div>';
        $('#posts').append(html);
    }
}

// A different solution using templating. An html template is loaded from 'layouts/post-layout' and then
// the views are registered to show the content in '/data/post-pool'.
function addPostsLoadingTemplate(){
    $('#posts').empty();
    //$('#posts').innerHTML = "";
    
    //var postPool = $.nub.get('/data/post-pool');
    //var poolLength = $.nub.get('/data/post-pool/length');
   
    console.log('post-pool length ' + $.nub.get('/data/post-pool/length'));
    for(var i= $.nub.get('/data/post-pool/length'); i--; 0){
        // Create a post element
        var postElement =
            $(document.createElement('div'))
                .attr({
                    id : i 
            })
        // Load the layout in the post element and register views for post pool.
        $(postElement).load('layouts/post-layout.html', function(){
            var id = $(this).attr('id');    // get the post id from the element attribute.
            $(this).find('[data]').nub('/data/post-pool/' + id);   // register views. 
        });
        $('#posts').append(postElement);
    }
}

// Create blog main menu.
function createBlogMenu(){
    $('#blog-main-menu').nubDynamicMenu({
        'frame' : {
            //'contentKeyRef' : '/data/contentKeyRef',
            'makeLayoutURI' : function(key){
                return 'sections/' + key + '/main.html';
            },
            'makeSetupURI' : function(key){
                return 'sections/' + key + '/setup.js';
            }
        }
    });
}

