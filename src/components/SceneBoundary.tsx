import { Component, type ErrorInfo, type ReactNode } from 'react';

interface SceneBoundaryState {
  failed: boolean;
}

/** Keeps a failed WebGL context from taking down the whole dashboard. */
export class SceneBoundary extends Component<{ children: ReactNode }, SceneBoundaryState> {
  state: SceneBoundaryState = { failed: false };

  static getDerivedStateFromError(): SceneBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Campus scene failed to start', error, info);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <div className="map-fallback" role="alert">
        <p className="map-fallback__title">Map could not start</p>
        <p className="map-fallback__body">
          The countdowns, live loop and full timetable below still work.
        </p>
        <a className="map-fallback__link" href="#today-title">
          View today&apos;s schedule
        </a>
      </div>
    );
  }
}
