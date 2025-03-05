import { defineComponent } from 'vue';
import AsteroidDodge3DGame from './AsteroidDodge3DGame.vue';

export default defineComponent({
  name: 'AsteroidDodge3DGameWrapper',
  components: {
    AsteroidDodge3DGame
  },
  setup() {
    return {};
  }
});
