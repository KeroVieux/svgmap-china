/**
 * AvatarUI-地图
 * @version v2.0.1
 * @author  liubb(290781681@qq.com)
 * @date    2013-05-28
 */


;!function(win, $, undefined){

	$.fn.SVGMap = function (opts) {
        var $this = $(this),
            data = $this.data();

        if (data.SVGMap) {
            delete data.SVGMap;
        }
        if (opts !== false) {
            data.SVGMap = new SVGMap($this, opts);
        }
        return data.SVGMap;
    };

    var __hasProp = {}.hasOwnProperty;
	
    var mergeObjects = function (obj1, obj2) {
        var key, out, val;
        out = {};
        for (key in obj1) {
            if (!__hasProp.call(obj1, key)) continue;
            val = obj1[key];
            out[key] = val;
        }
        for (key in obj2) {
            if (!__hasProp.call(obj2, key)) continue;
            val = obj2[key];
            out[key] = val;
        }
        return out;
    };

    var SVGMap = (function(){
        function SVGMap(dom, options){
            this.dom = dom;
            this.setOptions(options);
            this.render();
        }

        SVGMap.prototype.options = {
            mapName: 'china',
            mapWidth: 500,
            mapHeight: 400,
            stateColorList: ['2770B5', '429DD4', '5AABDA', '1C8DFF', '70B3DD', 'C6E1F4', 'EDF2F6'],
            stateDataAttr: ['stateInitColor', 'stateHoverColor', 'stateSelectedColor', 'baifenbi'],
            stateDataType: 'json',
            stateSettingsXmlPath: '',
            stateData: {},
            
            strokeWidth: 1,
            strokeColor: 'F9FCFE',

            stateInitColor: 'AAD5FF',
            stateHoverColor: 'feb41c',
            stateSelectedColor: 'E32F02',
            stateDisabledColor: 'eeeeee',

            showTip: true,
            stateTipWidth: 100,
            //stateTipHeight: 50,
            stateTipX: 0,
            stateTipY: -10,
            stateTipHtml: function(stateData, obj){
                return obj.name;
            },

            hoverCallback: function(stateData, obj){},
            clickCallback: function(stateData, obj){},
            external: false
        };
        SVGMap.prototype.setOptions = function (options) {
            if (options == null) {
                options = null;
            }
            this.options = mergeObjects(this.options, options);
            return this;
        };

		// 扩展svg属性， 支持大小控制
        SVGMap.prototype.scaleRaphael = function(container, width, height) {
                var wrapper = document.getElementById(container);
                if (!wrapper.style.position) wrapper.style.position = "relative";
                wrapper.style.width = width + "px";
                wrapper.style.height = height + "px";
                wrapper.style.overflow = "hidden";
                var nestedWrapper;
                if (Raphael.type == "VML") {
                    wrapper.innerHTML = "<rvml:group style='position : absolute; width: 1000px; height: 1000px; top: 0px; left: 0px' coordsize='1000,1000' class='rvml' id='vmlgroup_" + container + "'><\/rvml:group>";
                    nestedWrapper = document.getElementById("vmlgroup_" + container);
                } else {
                    wrapper.innerHTML = "<div class='svggroup'><\/div>";
                    nestedWrapper = wrapper.getElementsByClassName("svggroup")[0];
                }
                var paper = new Raphael(nestedWrapper, width, height);
                var vmlDiv;
                if (Raphael.type == "SVG") {
                    paper.canvas.setAttribute("viewBox", "0 0 " + width + " " + height);
                } else {
                    vmlDiv = wrapper.getElementsByTagName("div")[0];
                }
                paper.changeSize = function (w, h, center, clipping) {
                    clipping = !clipping;
                    var ratioW = w / width;
                    var ratioH = h / height;
                    var scale = ratioW < ratioH ? ratioW : ratioH;
                    var newHeight = parseInt(height * scale);
                    var newWidth = parseInt(width * scale);
                    if (Raphael.type == "VML") {
                        var txt = document.getElementsByTagName("textpath");
                        for (var i in txt) {
                            var curr = txt[i];
                            if (curr.style) {
                                if (!curr._fontSize) {
                                    var mod = curr.style.font.split("px");
                                    curr._fontSize = parseInt(mod[0]);
                                    curr._font = mod[1];
                                }
                                curr.style.font = curr._fontSize * scale + "px" + curr._font;
                            }
                        }
                        var newSize;
                        if (newWidth < newHeight) {
                            newSize = newWidth * 1000 / width;
                        } else {
                            newSize = newHeight * 1000 / height;
                        }
                        newSize = parseInt(newSize);
                        nestedWrapper.style.width = newSize + "px";
                        nestedWrapper.style.height = newSize + "px";
                        if (clipping) {
                            nestedWrapper.style.left = parseInt((w - newWidth) / 2) + "px";
                            nestedWrapper.style.top = parseInt((h - newHeight) / 2) + "px";
                        }
                        vmlDiv.style.overflow = "visible";
                    }
                    if (clipping) {
                        newWidth = w;
                        newHeight = h;
                    }
                    wrapper.style.width = newWidth + "px";
                    wrapper.style.height = newHeight + "px";
                    paper.setSize(newWidth, newHeight);
                    if (center) {
                        wrapper.style.position = "absolute";
                        wrapper.style.left = parseInt((w - newWidth) / 2) + "px";
                        wrapper.style.top = parseInt((h - newHeight) / 2) + "px";
                    }
                };
                paper.scaleAll = function (amount) {
                    paper.changeSize(width * amount, height * amount);
                };
                paper.changeSize(width, height);
                paper.w = width;
                paper.h = height;
                return paper;
        }

		// 绘制数据
        SVGMap.prototype.render = function(){
            var opt = this.options, 
                _self = this.dom,
                mapName = opt.mapName,
                mapConfig = eval(mapName + 'MapConfig');

            var stateData = {};

            if(opt.stateDataType == 'xml'){
                var mapSettings = opt.stateSettingsXmlPath;
                $.ajax({
                    type: 'GET',
                    url: mapSettings,
                    async: false,
                    dataType: $.browser.msie ? 'text' : 'xml',
                    success: function (data) {
                        var xml;
                        if ($.browser.msie) {
                            xml = new ActiveXObject('Microsoft.XMLDOM');
                            xml.async = false;
                            xml.loadXML(data);
                        } else {
                            xml = data;
                        }
                        var $xml = $(xml);
                        $xml.find('stateData').each(function(i) {
                            var $node = $(this),
                                stateName = $node.attr('stateName');
                            
                            stateData[stateName] = {};
                            for(var i = 0, len = opt.stateDataAttr.length; i < len; i++){
                                stateData[stateName][opt.stateDataAttr[i]] = $node.attr(opt.stateDataAttr[i]);
                            }
                        });
                    }
                });
            }else{
                stateData = opt.stateData;
            }
            
            var offsetXY = function(e){
                var mouseX, 
                    mouseY,
                    tipWidth = $('.stateTip').outerWidth(),
                    tipHeight = $('.stateTip').outerHeight();
                if(e && e.pageX){
                    mouseX = e.pageX;
                    mouseY = e.pageY;
                }else{
                    mouseX = event.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
                    mouseY = event.clientY + document.body.scrollTop + document.documentElement.scrollTop;
                }
                mouseX = mouseX - tipWidth/2 + opt.stateTipX < 0 ? 0 : mouseX - tipWidth/2 + opt.stateTipX;
                mouseY = mouseY - tipHeight + opt.stateTipY < 0 ? mouseY - opt.stateTipY : mouseY - tipHeight + opt.stateTipY;
                return [mouseX, mouseY];
            };

            var current , reTimer , oldState  ;
			
			// 将地图绘制到制定层上
            var r = this.scaleRaphael(_self.attr('id'), mapConfig.width, mapConfig.height),
                attributes = {
                    fill: '#' + opt.stateInitColor,
                    cursor: 'pointer',
                    stroke: '#' + opt.strokeColor,
                    'stroke-width': opt.strokeWidth,
                    'stroke-linejoin': 'round'
                };

            var stateColor = {};

			// 热点数据使用变量
			var oldFrame , oldLable ,
				oldPointText = new Array(5);
			
			// 热点数据颜色集合
			var colorPoint = {
								"fuyu":["#E9FFBE","较富裕"],
								"fullfuyu":["#BEFFE7","一定富裕"],
								"pingheng":["#43FFBA","基本平衡"],
								"quekou":["#FCA87C","一定缺口"],
								"bigquekou":["#FD5305","较大缺口"]
							};			

			var textAttr = {
				"fill": "#000",
				"font-size": "11px",
				"cursor": "pointer"
			};

			// 绘制对比参数表,生成图例层
			var $tiplayer = $("#tiplayer");
			var $tipTable = $("<table/>").attr("width","120px");
			var $tipTr = $("<tr/>").append($("<td/>").append("<font size=2>图例</font>"));
			
			$tipTable.append($tipTr);

			for(var color in colorPoint){
				
				var $tipTr1 = $("<tr/>").append($("<td>&nbsp</td>").attr("width","50px").attr("bgcolor",colorPoint[color][0]))
										.append("<td>&nbsp;&nbsp;"+colorPoint[color][1]+"</td>");

				$tipTable.append($tipTr1);
			}
			$tiplayer.append($tipTable);
			

            // 绘制省份名称及事件
            for (var state in mapConfig.shapes) {
                var thisStateData = stateData[state],
                    initColor = '#' + (thisStateData && opt.stateColorList[thisStateData.stateInitColor] || opt.stateInitColor),
                    hoverColor = '#' + (thisStateData && thisStateData.stateHoverColor || opt.stateHoverColor),
                    selectedColor = '#' + (thisStateData && thisStateData.stateSelectedColor || opt.stateSelectedColor),
                    disabledColor = '#' + (thisStateData && thisStateData.stateDisabledColor || opt.stateDisabledColor);
                
                stateColor[state] = {};

                stateColor[state].initColor = initColor;
                stateColor[state].hoverColor = Raphael.getColor(0.9);
                stateColor[state].selectedColor = selectedColor;
				
                var obj = r.path(mapConfig['shapes'][state]);
                obj.id = state;
                obj.name = mapConfig['names'][state];
                obj.attr(attributes);				
				// 初始化位移大小
				obj.transform("t30,0");

			   (function (st, state){					    

					//获取当前图形的中心坐标
					var xx = st.getBBox().x + (st.getBBox().width / 2);
					var yy = st.getBBox().y + (st.getBBox().height / 2);			
					
					//修改部分地图文字偏移坐标
					switch (st['name']) {
						case "江苏":
							xx += 5;
							yy -= 10;
							break;
						case "河北":
							xx -= 10;
							yy += 20;
							break;
						case "天津":
							xx += 20;
							yy += 10;
							break;
						case "上海":
							xx += 20;
							break;
						case "广东":
							yy -= 10;
							break;
						case "澳门":
							yy += 10;
							break;
						case "香港":
							xx += 20;
							yy += 5;
							break;
						case "甘肃":
							xx -= 40;
							yy -= 30;
							break;
						case "陕西":
							xx += 5;
							yy += 20;
							break;
						case "内蒙古":
							xx -= 15;
							yy += 65;
							break;
						case "华东电网":
							yy -= 15;
							break;
						default:
					}
					
					 //写入地名,并加点击事件,部分区域太小，增加对文字的点击事件
					st.text = r.text(xx, yy, mapConfig['names'][state]).attr(textAttr).click(function(){
						clickMap();
					});	
					
					(function (){
						var xxTemp = xx ;
						var yyTemp = yy ;
						$(st[0]).click(function(e){	
							clickMap();
						});	
					})()									
					
					function clickMap(){
						
						if ( oldState == st)
							return ;             
						
						//重置上次点击的图形		
						oldState && oldState.animate({ 
							transform: "t30,0", 
							fill: '#' + opt.stateInitColor,
							cursor: 'pointer',
							stroke: '#' + opt.strokeColor,
							'stroke-width': opt.strokeWidth,
							'stroke-linejoin': 'round'
						}, 2000, "elastic"); 
						                       																		 
						oldState = st;    //将当前值赋给变量
						
						// 调用后台， 计算点击的省份的热点数据,并将输电数据返回，展示在图上
						var colorPointType = "pingheng";   // 此处固定值测试

						// 查不到数据值， 则显示白色
						var hoverColor = colorPoint[colorPointType]==undefined|| colorPoint[colorPointType]==null?"white":colorPoint[colorPointType][0] ;

						st.animate({
							transform: "t30,0 s1.03 1.03",
							fill: hoverColor,
							cursor: 'pointer',
							stroke: 'black',
							'stroke-linejoin': 'round',
							'stroke-width': 2
						},  1200, "elastic");										
						
						st.toFront();
						r.safari();
						
						st.text.toFront();

						// 绘制输电量箭头 ， 起点：当前点击的省份 ； 终点：从后台数据库中查询出来（多个）
						r.drawArr({ obj1:st, obj2:r.path(mapConfig['shapes']['hubei']).transform("t30,0"),obj3:state });
						r.drawArr({ obj1:st, obj2:r.path(mapConfig['shapes']['jiangsu']).transform("t30,0"),obj3:state });
						r.drawArr({ obj1:st, obj2:r.path(mapConfig['shapes']['liaoning']).transform("t30,0"),obj3:state });
						r.drawArr({ obj1:st, obj2:r.path(mapConfig['shapes']['xinjiang']).transform("t30,0"),obj3:state });						
					}

					//随着节点位置的改变动态改变箭头
					Raphael.fn.drawArr = function (obj) {
						// 获得起始两个节点的 x ，y 坐标
						var xx1 = obj.obj1.getBBox().x + (obj.obj1.getBBox().width / 2);
						var yy1 = obj.obj1.getBBox().y + (obj.obj1.getBBox().height / 2);

						var xx2 = obj.obj2.getBBox().x + (obj.obj2.getBBox().width / 2);
						var yy2 = obj.obj2.getBBox().y + (obj.obj2.getBBox().height / 2);

						switch (obj.obj3) {
							case "jiangsu":
								xx1 += 5;
								yy1 -= 10;
								break;
							case "hebei":
								xx1 -= 10;
								yy1 += 20;
								break;
							case "tianjin":
								xx1 += 20;
								yy1 += 10;
								break;
							case "shanghai":
								xx1 += 20;
								break;
							case "guangdong":
								yy1 -= 10;
								break;
							case "macau":
								yy1 += 10;
								break;
							case "hongkong":
								xx1 += 20;
								yy1 += 5;
								break;
							case "gansu":
								xx1 -= 40;
								yy1 -= 30;
								break;
							case "shaanxi":
								xx1 += 5;
								yy1 += 20;
								break;
							case "neimongol":
								xx1 -= 15;
								yy1 += 65;
								break;
							default:
						}
						
						var path1 = getArr( xx1 , yy1+5 , xx2 , yy2-5 , 8);  // 8 是表示箭头的大小
						obj.arrPath = r.path(path1);
						return obj;
					};

					/*
					function getStartEnd(obj1, obj2) {
						var bb1 = obj1.getBBox(),
							bb2 = obj2.getBBox();
						var p = [
								{ x: bb1.x + bb1.width / 2, y: bb1.y - 1 },
								{ x: bb1.x + bb1.width / 2, y: bb1.y + bb1.height + 1 },
								{ x: bb1.x - 1, y: bb1.y + bb1.height / 2 },
								{ x: bb1.x + bb1.width + 1, y: bb1.y + bb1.height / 2 },
								{ x: bb2.x + bb2.width / 2, y: bb2.y - 1 },
								{ x: bb2.x + bb2.width / 2, y: bb2.y + bb2.height + 1 },
								{ x: bb2.x - 1, y: bb2.y + bb2.height / 2 },
								{ x: bb2.x + bb2.width + 1, y: bb2.y + bb2.height / 2 }
							];
						var d = {}, dis = [];
						for (var i = 0; i < 4; i++) {
							for (var j = 4; j < 8; j++) {
								var dx = Math.abs(p[i].x - p[j].x),
									dy = Math.abs(p[i].y - p[j].y);
								if (
									 (i == j - 4) ||
									 (((i != 3 && j != 6) || p[i].x < p[j].x) &&
									 ((i != 2 && j != 7) || p[i].x > p[j].x) &&
									 ((i != 0 && j != 5) || p[i].y > p[j].y) &&
									 ((i != 1 && j != 4) || p[i].y < p[j].y))
								   ) {
									dis.push(dx + dy);
									d[dis[dis.length - 1]] = [i, j];
								}
							}
						}
						if (dis.length == 0) {
							var res = [0, 4];
						} else {
							res = d[Math.min.apply(Math, dis)];
						}
						var result = {};
						result.start = {};
						result.end = {};
						result.start.x = p[res[0]].x;
						result.start.y = p[res[0]].y;
						result.end.x = p[res[1]].x;
						result.end.y = p[res[1]].y;
						return result;
					} */

					//获取组成箭头的三条线段的路径
					function getArr(x1, y1, x2, y2, size) {
						var angle = Raphael.angle(x1, y1, x2, y2);//得到两点之间的角度
						var a45 = Raphael.rad(angle - 45);//角度转换成弧度
						var a45m = Raphael.rad(angle + 45);
						var x2a = x2 + Math.cos(a45) * size;
						var y2a = y2 + Math.sin(a45) * size;
						var x2b = x2 + Math.cos(a45m) * size;
						var y2b = y2 + Math.sin(a45m) * size;
						var result = ["M", x1, y1, "L", x2, y2, "L", x2a, y2a, "M", x2, y2, "L", x2b, y2b];
						return result;
					}

			   })
				   
			   (obj, state)
                
               r.changeSize(opt.mapWidth, opt.mapHeight, false, false);					 			    
				

			   // 绘制完地图后， 计算图例层显示的 x ，y 坐标
			   $tiplayer.css("position","absolute").css("left",(document.body.offsetWidth-$("#map").width())/2+$("#map").width()).css("top",document.body.offsetHeight-$tiplayer.height()-30);
            }     
			
        }

        return SVGMap;
    })();

    
}(this, jQuery);