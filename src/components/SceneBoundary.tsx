import { Component, type ErrorInfo, type ReactNode } from 'react';

interface SceneBoundaryProps {
  children: ReactNode;
  onUseFallback: () => void;
}

interface SceneBoundaryState {
  failed: boolean;
}

/** Keeps a failed WebGL context from taking down the whole dashboard. */
export class SceneBoundary extends Component<SceneBoundaryProps, SceneBoundaryState> {
  state: SceneBoundaryState = { failed: false };

  static getDerivedStateFromError(): SceneBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('3D campus scene failed to start', error, info);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <div className="map-fallback" role="alert">
        <p className="map-fallback__title">3D map unavailable</p>
        <p className="map-fallback__body">The 3D scene could not start on this device. The 2D map has the same stops.</p>
        <button type="button" className="button button--primary" onClick={this.props.onUseFallback}>
          Use the 2D map
        </button>
      </div>
    );
  }
}
