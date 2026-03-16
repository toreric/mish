//== Mish local-time component, used by Welcome

import { cell, resource, resourceFactory } from 'ember-resources';

const clockText = resourceFactory((locale='sv-se') => {
  let aTime = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
    timeZoneName: 'short'
  });

  return resource(({ on }) => {
    let time = cell(new Date());
    let interval = setInterval(() => time.current = new Date(), 1000);

    on.cleanup(() => clearInterval(interval));

    return () => aTime.format(time.current);
  });
});

// SUGGESTED: export Clock directly

// export const Clock = resource(({ on }) => {
//   let time = cell(new Date());
//   let interval = setInterval(() => (time.current = new Date()), 1000);

//   on.cleanup(() => clearInterval(interval));

//   return () => aTime.format(time.current);
// });

// MODIFIED: export component

export const Clock = <template>
  {{! locale is reset when imported }}
  {{clockText locale='ko-ko'}}
</template>
