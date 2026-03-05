import { getAllServerStates } from "@shared/utils/serverStateManager";
import { renderAllBlocks } from "@shared/utils/blockRenderer";

interface RenderState {
  renderLoop: NodeJS.Timeout | null;
  isRunning: boolean;
}

let renderState: RenderState = {
  renderLoop: null,
  isRunning: false,
};

export const startRenderLoop = (initialDelay: number = 2000, interval: number = 300): void => {
  if (renderState.isRunning) {
    return;
  }

  setTimeout(() => {
    try {
      const states = getAllServerStates();
      renderAllBlocks(states);
    } catch (error) {
      console.error(error);
    }

    renderState = {
      ...renderState,
      renderLoop: setInterval(() => {
        try {
          const states = getAllServerStates();
          renderAllBlocks(states);
        } catch (error) {
          console.error(error);
        }
      }, interval),
      isRunning: true,
    };
  }, initialDelay);
};

export const stopRenderLoop = (): void => {
  if (renderState.renderLoop) {
    clearInterval(renderState.renderLoop);
  }

  renderState = {
    renderLoop: null,
    isRunning: false,
  };
};
