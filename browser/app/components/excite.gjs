//== Experimental

import { modifier } from 'ember-modifier';

const intensify = modifier(element => {
  let animation = element.animate([
    { transform: "translateX(2px)" },
    { transform: "translateY(1px)" },
    { transform: "translateX(-2px)" },
  ], {
    duration: 500,
    iterations: Infinity,
  });

  return () => animation.cancel();
});

export const Excite = <template>
  <div {{intensify}} style="top: 1rem; left: 1rem;display:inline-block">
    🥳
  </div>
</template>;
