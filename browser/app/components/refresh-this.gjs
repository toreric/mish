//== Refreshes some DOM part at an update

import { array } from '@ember/helper';

<template>
  {{#each (array @for)}}
    {{yield}}
  {{/each}}
</template>;

