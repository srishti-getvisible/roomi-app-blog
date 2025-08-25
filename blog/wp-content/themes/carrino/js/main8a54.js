jQuery(document).ready(function($){

  "use strict";

/*---------------------------------------*/
/* Sticky Header Nav                     */
/*---------------------------------------*/

     var nav = $('.site-header.sticky-nav');
     var body = $('body.has-sticky-nav');
     var wrapper = $('body.custom-background .site-wrapper');
     var headerheight = $(".site-header.sticky-nav").outerHeight() + 30; // Header height + bottom header margin
     // Custom header variant
     if ($('body').hasClass('has-custom-header') && $('body').hasClass('has-category-featured-background') ) {
      var headerheight = $(".site-header.sticky-nav").outerHeight();
    }
    if ($('body').hasClass('has-custom-header') && $('body').hasClass('has-featured-posts-background') && ! $('body').hasClass('has-hero') ) {
      var headerheight = $(".site-header.sticky-nav").outerHeight();
    }
    // Custom header variant
     if (! $('body').hasClass('has-custom-header') && $('body').hasClass('has-category-featured-background') ) {
      var headerheight = $(".site-header.sticky-nav").outerHeight() + 45; // Header height
    }

     var logoheight = $(".site-header.sticky-nav .container").outerHeight();
     var secondarynavheight = $(".site-header.sticky-nav .menu-header-secondary-container").outerHeight();
     var scrolltop = logoheight + secondarynavheight;
     if ($('.site-header.sticky-nav').hasClass('logo-split-menu') || $('.site-header.sticky-nav').hasClass('logo-left-menu-right') ) {
        scrolltop = 45;
      }
      // Custom header variant
     if ($('body').hasClass('has-custom-header') && ( $('.site-header').hasClass('logo-split-menu') || $('.site-header').hasClass('logo-left-menu-right') ) ) {
      var scrolltop = 0;
    }

    var boxednavpadding = logoheight; // Logo height + bottom header margin
    
    $(window).on('scroll', function () {
        if ($(this).scrollTop() > scrolltop ) {
            if ($('body.has-sticky-nav').hasClass('custom-background')) {
            nav.addClass("fixed");
            wrapper.css("padding-top", "" + boxednavpadding + "px" );
          } else {
            nav.addClass("fixed").css("margin-top", "-" + headerheight + "px" );
            body.addClass("body-fix").css("margin-top", "" + headerheight + "px" );
          }
        } else {
            nav.removeClass("fixed").css("margin-top", "" );
            body.removeClass("body-fix").css("margin-top", "" );
            wrapper.css("padding-top", "" );
        }
    });

/*---------------------------------------*/
/* Slide Menu Sidebar                    */
/*---------------------------------------*/

$(".toggle-menu span, .slide-menu .close-menu, .body-fade").on('click', function() {
        $(".mobile-navigation").toggleClass("show");
        $("html").toggleClass("inactive");
        $(".body-fade").fadeToggle(400);

        // Check for an active search form and close it
        if($('.site-header .search-form').hasClass('show-search')) {
           $(".site-header .search-form").slideToggle(300);
           $(".site-header .search-form").toggleClass("show-search");
           // Toggle the close icon
           $('li.search i.fa-search').toggle();
          $('li.search i.fa-close').toggle();
        }
});

// Expand the parent/child menu
$('.slide-menu ul.primary-nav-sidebar li.menu-item-has-children > span.expand').on('click', function(event) {
    event.preventDefault();
   $(this).next('.sub-menu').slideToggle(200);
   $(this).toggleClass("close");
});

/*---------------------------------------*/
/* Search drop down                      */
/*---------------------------------------*/

  $(".toggle-search span, .site-search i, .message-404 .toggle-search").on('click', function() {
        $(".site-search").toggleClass("show-search");
        $(".site-search").fadeToggle(300);

        // Focus the cursor on the search field when it's visible
        $(".site-search.show-search .search-field").focus();

        // Remove focus when not visible
        $('.site-search:not(.show-search) .search-field').blur();

        if($('.mobile-navigation').hasClass("show")) {
               $(".mobile-navigation").toggleClass("show");
               $(".body-fade").fadeToggle(300);
            }

});

/*---------------------------------------*/
/* ESC key close of open toggle elements */
/*---------------------------------------*/

$(document).keyup(function(e) { 
        if (e.keyCode == 27) { // esc keycode
            if($(".site-search").hasClass("show-search")) {
               $(".site-search").fadeToggle(300);
               $(".site-search").toggleClass("show-search");
            }
            if($('.mobile-navigation').hasClass("show")) {
               $(".mobile-navigation").toggleClass("show");
               $(".body-fade").fadeToggle(500);
            }
        }
    });

/*---------------------------------------*/
/* smooth scroll to top                  */
/*---------------------------------------*/
$(".backtotop").on('click', function(event){
    event.preventDefault();
    $('body,html').animate({
        scrollTop: 0 ,
        }, 500
    );
});
/*---------------------------------------*/
/* Back to Top Pop Up Link               */
/*---------------------------------------*/
// browser window scroll (in pixels) after which the "back to top" link is shown
    var offset = 1200,
        //duration of the top scrolling animation (in ms)
        scroll_top_duration = 100,
        //grab the "back to top" link
        $back_to_top = $('.goto-top');

    //hide or show the "back to top" link
    $(window).on('scroll', function(){
        ( $(this).scrollTop() > offset ) ? $back_to_top.addClass("visible") : $back_to_top.removeClass("visible");
    });
/*---------------------------------------*/
/* smooth scroll anchor links            */
/*---------------------------------------*/
$(document).on('click', 'a[href^="#comments"], a[href^="#reviews"]', function (event) {
    event.preventDefault();
    // alert("boom");

    $('html, body').animate({
        scrollTop: $($.attr(this, 'href')).offset().top
    }, 600);
});

/*---------------------------------------*/
/* Toggle comments                       */
/*---------------------------------------*/

$('.toggle-comments').on('click', function() {
   $('#comments').slideToggle(400);
   $('#comments').toggleClass("open");
   $(this).toggleClass("close");
});
// Comments anchor link open and reset toggle comments
$('.entry-comment-count a').on('click', function() {
   if (! $('#comments').hasClass("open") ) {
    $('#comments').slideToggle(400);
    $('#comments').toggleClass("open");
    $('.toggle-comments').toggleClass("close");
   }
});
$('.comments-pagination a.page-numbers').on('click', function() {
   if ($('#comments').hasClass("close") ) {
    $('#comments').slideToggle(400);
    $('#comments').toggleClass("close");
    $('.toggle-comments').toggleClass("open");
   }
});

/*---------------------------------------*/
/* Parallax iOs & Android Fix            */
/*---------------------------------------*/
$(function(){

        if (navigator.userAgent.match(/(iPod|iPhone|iPad|Android)/)) {
          $('.hero .flex-box.parallax-window').addClass('is-mobile-device');
        }
      });


/*---------------------------------------*/
/* Split menu alignment                  */
/*---------------------------------------*/

var maxWidth = 0; // Initialize to zero
var splitMenu = $('.split-menu'); // Cache to improve performance

splitMenu.each(function() { // Loop over all the elements having class example

    // Get the max width of elements and save in maxWidth variable
    maxWidth = parseFloat($(this).outerWidth()) > maxWidth ? parseFloat($(this).outerWidth()) : maxWidth;
});

$('.split-menu').css("width", "" + maxWidth + "px" ); // Set max height to all example elements



});

