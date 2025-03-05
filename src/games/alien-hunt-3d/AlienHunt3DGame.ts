import { defineComponent } from 'vue';
import AlienHunt3DGame from './AlienHunt3DGame.vue';

export default defineComponent({
  name: 'AlienHunt3DGameWrapper',
  components: {
    AlienHunt3DGame
  },
  setup() {
    return {};
  }
});
