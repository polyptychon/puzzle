/**
 * Created by Harris Sidiropoulos
 */

(function() {
    "use strict";
    window.addEventListener("load", function() {
        var dragTarget, dragX, dragY, parts, g, isServer = $_IS_SERVER, lockLayers = false;
        //var s = Snap("960", "650");
        var s = Snap("svg");

        Snap.load("./assets/svg/puzzle-bg.svg", function (f) {
            f.selectAll("path").attr({
                fill: "#bada55",
                stroke: "#000",
                opacity:.1,
                strokeWidth: 1
            });
            g = f.selectAll("g");
            s.append(g);
        });

        Snap.load("assets/svg/puzzle-parts.svg", function (f) {

            parts = f.selectAll("g");
            var length = parts.length;
            s.append(f.selectAll("defs"));

            for (var i=0;i< length;i++) {
                var item = parts[i];
                item.init = { box: getCenterPivotPoint(item.node).box, x : 0, y : 0, rotate: 0, item: item}
                s.append(item);

                item.node.addEventListener("mouseover", onMouseOver);
                item.node.addEventListener("mousedown", onMouseDown);
                item.node.addEventListener("mouseup", onMouseClick);
                item.node.addEventListener("touchstart", onMouseDown);
            }
            if (!TogetherJS.running) {
                shufflePuzzleParts();
            } else {
                TogetherJS.send({type: "moveAll"});
            }

            document.querySelector("#change-image").addEventListener("click", function() {
                var photo = s.select("#photo");
                if (photo.node.getAttribute("href")==="./assets/img/image001.jpg") {
                    photo.node.setAttribute("href", "./assets/img/image002.jpg");
                } else {
                    photo.node.setAttribute("href", "./assets/img/image001.jpg");
                }
                moveAll();
                if (TogetherJS.running) {
                    TogetherJS.send({type: "changeImage", image: photo.node.getAttribute("href")});
                }
            });

            document.querySelector("#solve").addEventListener("click", function() {
                shufflePuzzleParts(0, "./assets/svg/shuffle/shuffle-0.svg", 0);
            });
            document.querySelector("#shuffle").addEventListener("click", function() {
                shufflePuzzleParts(0);
            });

            /*
            document.querySelector("body").addEventListener("click", function() {
                var str = "<svg>";
                for (var i=0;i< length;i++) {
                    str += parts[i].toString();
                }
                console.log(str+"</svg>");
            });
             */
        });
        function isPuzzleSolved() {
            var i = 0, l = parts.length;
            for (i; i<l; i+=1) {
                if (!(parts[i].init.x===0 && parts[i].init.y===0)) {
                    return false;
                }
            }
            return true;
        }
        function getPuzzlePartByClipPath(clipPath) {
            var i = 0, l = parts.length;
            for (i; i<l; i+=1) {
                if (parts[i].node.getAttribute("clip-path")==clipPath) {
                    return parts[i];
                }
            }
            return false;
        }

        function shufflePuzzleParts(delay, file, rotate) {
            delay = typeof delay==="undefined"?1:delay;
            var f = Math.ceil(Math.random()*10);
            file = typeof file==="undefined"?"assets/svg/shuffle/shuffle-"+f+".svg":file;
            Snap.load(file, function (f) {

                var tempParts = f.selectAll("g"),
                    length = parts.length, item,
                    transform, rotateArray = [0, 90, 180, 270], tweens = [], r, tl;

                for (var i=0;i< length;i++) {
                    item = parts[i];
                    transform = getItemPosition(tempParts[i]);
                    r = typeof rotate==="undefined"?rotateArray[Math.floor(Math.random()*rotateArray.length)]:rotate;
                    tweens.push(TweenMax.to(item.init, 1, {x:transform.x, y:transform.y, rotate: r,
                        onUpdate: function() {
                            transformItem(this.target.item, this.target.rotate, this.target.x, this.target.y);
                        }
                    }));
                }
                tl = new TimelineMax({tweens : tweens, align : "start", stagger :.1, delay : delay});


            });
        }
        function getItemPosition(u) {
            var tIndex = u.toString().indexOf('transform="')+18,
            eIndex = u.toString().indexOf('"', tIndex)-1,
            transform = u.toString().substring(tIndex, eIndex),
            a = transform.split(",").join(" ").split(" ");
            return {
                x: parseFloat(a[a.length-2]),
                y: parseFloat(a[a.length-1])
            };
        }
        function onMouseClick(event) {
            var u = Snap(dragTarget);
            if (!(event.ctrlKey || event.shiftKey)) return;
            var rotate = u.transform().globalMatrix.split().rotate+90;
            transformItem(u, rotate);
        }
        function getCenterPivotPoint(target) {
            var clipPath = target.getAttribute("clip-path").split('"').join('');
            clipPath = clipPath.substring(4, clipPath.length-1);
            clipPath = s.select(clipPath).select("use").node.getAttribute("href")
            var path = s.select(clipPath);
            var box = Snap.path.getBBox(path);
            return {
                x : box.x+box.width/2,
                y : box.y+box.height/2,
                box : box
            };
        }
        function localToGlobal(u) {
            var svg = document.querySelector("svg"),
                rect = svg.getBoundingClientRect();
            return {
                x: rect.left+u.init.box.x+u.init.x,
                y: rect.top+u.init.box.y+u.init.y
            }
        }
        function globalToLocal(u, x, y) {
            var svg = document.querySelector("svg"),
                rect = svg.getBoundingClientRect();
            return {
                x: x-(rect.left+u.init.box.x),
                y: y-(rect.top+u.init.box.y)
            }
        }
        function onMouseOver(event) {
            if (!lockLayers) s.select("g:last-child").after(Snap(event.currentTarget));
        }
        function onMouseDown(event) {
            dragTarget = event.currentTarget;
            var u = Snap(dragTarget),
                body = document.querySelector("body");

            body.addEventListener("mousemove", onMouseMove);
            body.addEventListener("mouseup", onMouseUp);

            body.addEventListener("touchmove", onMouseMove);
            body.addEventListener("touchend", onMouseUp);

            s.select("g:last-child").after(u);

            dragX = event.clientX-u.init.x;
            dragY = event.clientY-u.init.y;
            lockLayers = true;
        }
        function onMouseMove(event) {
            var u = Snap(dragTarget);
            transformItem(u, null, event.clientX-dragX, event.clientY-dragY);
        }
        function onMouseUp(event) {
            var body = document.querySelector("body");
            body.removeEventListener("mousemove", onMouseMove);
            body.removeEventListener("mouseup", onMouseUp);

            body.removeEventListener("touchmove", onMouseMove);
            body.removeEventListener("touchend", onMouseUp);
            lockLayers = false;
        }
        function moveAll() {
            var i = 0, l = parts.length;
            for (i; i<l; i+=1) {
                transformItem(parts[i], parts[i].init.rotate, parts[i].init.x, parts[i].init.y);
            }
            if (TogetherJS.running) {
                TogetherJS.send({type: "changeImage", image: s.select("#photo").node.getAttribute("href")});
            }
        }
        function transformItem(u, rotate, x, y, sendUpdate) {
            sendUpdate = typeof sendUpdate === "undefined" ? true : sendUpdate;
            var snapSize = 10;
            u.init.x = x = typeof x === "undefined" || x === null ? u.init.x : x;
            u.init.y = y = typeof y === "undefined" || y === null ? u.init.y : y;
            u.init.rotate = rotate = typeof rotate === "undefined" || rotate === null ? u.transform().globalMatrix.split().rotate : rotate;
            if ((x<snapSize && x>-snapSize) && (y<snapSize && y>-snapSize)) {
                x = x<snapSize && x>-snapSize?0:x;
                y = y<snapSize && y>-snapSize?0:y;
            }
            var pivot = getCenterPivotPoint(u.node);
            u.transform("translate("+x+", "+y+") rotate("+rotate+","+(pivot.x)+","+(pivot.y)+")");
            if (TogetherJS.running && sendUpdate) {
                var clipPath = u.node.getAttribute("clip-path");
                TogetherJS.send({type: "move", clipPath: clipPath, x:x, y:y, rotate: rotate});
            }
        }

        TogetherJS.hub.on("togetherjs.hello", function (msg) {
            if (! msg.sameUrl) {
                return;
            }
            isServer = true;
            TogetherJS.send({type: "init"});
        });
        TogetherJS.hub.on("init", function (msg) {
            if (! msg.sameUrl) {
                return;
            }
            TogetherJS.send({type: "moveAll"});
        });
        TogetherJS.hub.on("move", function (msg) {
            if (! msg.sameUrl) {
                return;
            }
            transformItem(getPuzzlePartByClipPath(msg.clipPath), msg.rotate, msg.x, msg.y, false);
        });
        TogetherJS.hub.on("changeImage", function (msg) {
            if (! msg.sameUrl) {
                return;
            }
            var photo = s.select("#photo");
            photo.node.setAttribute("href", msg.image);
        });
        TogetherJS.hub.on("moveAll", function (msg) {
            if (! msg.sameUrl) {
                return;
            }
            moveAll();
        });

        var togetherJSStartButton = document.querySelector("#multiPlayer"),
            togetherJSStartButtonLabel = togetherJSStartButton.innerHTML;

        togetherJSStartButton.addEventListener("click", function(event) {
            if (togetherJSStartButton.className.indexOf("disabled")<0) {
                TogetherJS(this);
                togetherJSStartButton.className += " disabled";
            }
        }, false);
        TogetherJS.on("ready", function (msg) {
            if (togetherJSStartButton.className.indexOf("btn-success")<0) {
                togetherJSStartButton.className += " btn-success";
            }
            togetherJSStartButton.className = togetherJSStartButton.className.split(" disabled").join("");
            setLabel();
            if (isServer) document.querySelector("#togetherjs-share-button").click();
        });
        TogetherJS.on("close", function (msg) {
            togetherJSStartButton.className = togetherJSStartButton.className.split(" btn-success").join("");
            togetherJSStartButton.className = togetherJSStartButton.className.split(" disabled").join("");
            setLabel();
        });
        function setLabel() {
            if (togetherJSStartButton.className.indexOf("btn-success")<0) {
                togetherJSStartButton.innerHTML = togetherJSStartButtonLabel;
                if (!isServer) togetherJSStartButton.className += " disabled";
            } else {
                togetherJSStartButton.innerHTML = togetherJSStartButton.getAttribute("data-close-label");
            }
        }

    });

})();
