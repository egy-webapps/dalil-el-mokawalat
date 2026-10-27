var GOVS = ["القاهرة","الجيزة","الإسكندرية","القليوبية","الشرقية","الدقهلية","الغربية","المنوفية","البحيرة","كفر الشيخ","دمياط","بورسعيد","الإسماعيلية","السويس","شمال سيناء","جنوب سيناء","الفيوم","بني سويف","المنيا","أسيوط","سوهاج","قنا","الأقصر","أسوان","البحر الأحمر","الوادي الجديد","مطروح"];

(function(){
  var old = document.getElementById("a_gov");
  if (!old) return;
  var sel = document.createElement("select");
  sel.id = "a_gov";
  sel.className = old.className;
  sel.style.cssText = old.style.cssText;
  sel.required = true;
  var first = document.createElement("option");
  first.value = "";
  first.textContent = "اختار المحافظة";
  sel.appendChild(first);
  GOVS.forEach(function(g){
    var o = document.createElement("option");
    o.value = g;
    o.textContent = g;
    sel.appendChild(o);
  });
  old.parentNode.replaceChild(sel, old);
})();
