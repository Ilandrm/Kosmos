import { defineComponent } from 'vue';
import Maze3DGame from './Maze3DGame.vue';

export default defineComponent({
  name: 'Maze3DGameWrapper',
  components: {
    Maze3DGame
  },
  setup() {
    return {};
  }
});
