<template>
  <div class="popup-overlay" @click="closePopup">
    <div class="popup-content" @click.stop>
      <h2>{{ message }}</h2>
      <button @click="closePopup">OK</button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';

export default defineComponent({
  name: 'TurnPopup',
  props: {
    message: {
      type: String,
      required: true
    }
  },
  setup(props) {
    const isVisible = ref(true);

    const closePopup = () => {
      isVisible.value = false;
      // Emit an event to notify parent component
      // This can be used to trigger any additional logic if needed
    };

    return { isVisible, closePopup };
  }
});
</script>

<style scoped>
.popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.popup-content {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  background-color: white;
  padding: 20px;
  border-radius: 10px;
  text-align: center;
}

button {
  margin-top: 10px;
  padding: 10px 20px;
  background-color: #ff3d7a;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

button:hover {
  background-color: #ff5e8f;
}

@media (max-width: 768px) {
  .popup-content {
    padding: 10px;
  }
}
</style>
