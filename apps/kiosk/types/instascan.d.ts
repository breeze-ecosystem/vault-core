declare module "instascan" {
  interface ScannerOptions {
    video: HTMLVideoElement;
    mirror?: boolean;
    captureImage?: boolean;
    backgroundScan?: boolean;
    refractoryPeriod?: number;
    scanPeriod?: number;
    onScan?: (content: string) => void;
  }

  interface Camera {
    id: string;
    name: string;
  }

  class Scanner {
    constructor(opts: ScannerOptions);
    addListener(event: "scan", handler: (content: string) => void): void;
    start(camera: Camera): Promise<void>;
    stop(): void;
  }

  namespace Camera {
    function getCameras(): Promise<Camera[]>;
  }

  const Instascan: {
    Scanner: typeof Scanner;
    Camera: {
      getCameras: typeof Camera.getCameras;
    };
  };

  export default Instascan;
}
