declare module '@azesmway/react-native-unity' {
  import * as React from 'react';
  import { NativeSyntheticEvent, ViewProps } from 'react-native';

  export interface UnityMessageEventPayload {
    message: string;
  }

  export interface UnityViewProps extends ViewProps {
    onUnityMessage?: (event: NativeSyntheticEvent<UnityMessageEventPayload>) => void;
    androidKeepPlayerMounted?: boolean;
    fullScreen?: boolean;
  }

  export default class UnityView extends React.Component<UnityViewProps> {
    postMessage(gameObject: string, methodName: string, message: string): void;
    unloadUnity(): void;
    pauseUnity?(pause: boolean): void;
    resumeUnity?(): void;
    windowFocusChanged?(hasFocus?: boolean): void;
  }
}
