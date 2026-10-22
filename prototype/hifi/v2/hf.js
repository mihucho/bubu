/* 页头滚动反馈：结构永远是「状态条 / 页头 / 滚动区 / 导航」四行，
   JS 只负责在滚动时给页头加一条发丝线与轻阴影（不改几何、不悬浮） */
(function () {
  var screen = document.querySelector('.screen');
  if (!screen) return;

  var bar = screen.querySelector(':scope > .phead2, :scope > .p2head, :scope > .dbar');
  var scroller = screen.querySelector(':scope > .scroll, :scope > .pbody, :scope > .chatwrap, :scope > .authwrap');
  if (!bar || !scroller) return;

  function apply() {
    bar.classList.toggle('is-scrolled', scroller.scrollTop > 4);
  }

  scroller.addEventListener('scroll', apply, { passive: true });
  apply();
})();
