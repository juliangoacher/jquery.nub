myClass.prototype = new parentClass;
myClass.constructor = function(){}

myClass = Class({
    Extends: parentClass,
    initialize: function(){...}
})

