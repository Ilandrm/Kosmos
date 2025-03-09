import { defineAsyncComponent } from 'vue';
import starCollectorIcon from '../../assets/images/game-icons/star-collector-icon.svg?url';

export default {
  id: 'star-collector-3d',
  title: 'Collecteur d\'Étoiles 3D',
  component: defineAsyncComponent(() => import('./StarCollector3DGame.vue')),
  icon: starCollectorIcon,
  description: 'Pilotez votre vaisseau spatial et collectez des étoiles tout en évitant les astéroïdes en 3D.'
}
