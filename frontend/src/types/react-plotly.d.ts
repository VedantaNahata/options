/* eslint-disable @typescript-eslint/no-explicit-any */
declare module "react-plotly.js" {
    import { Component } from "react";

    interface PlotParams {
        data: any[];
        layout?: any;
        config?: any;
        frames?: any[];
        style?: React.CSSProperties;
        className?: string;
        useResizeHandler?: boolean;
        onInitialized?: (figure: any, graphDiv: any) => void;
        onUpdate?: (figure: any, graphDiv: any) => void;
        onPurge?: (figure: any, graphDiv: any) => void;
        onError?: (err: any) => void;
        onClick?: (event: any) => void;
        onHover?: (event: any) => void;
        onUnhover?: (event: any) => void;
        onSelected?: (event: any) => void;
        onRelayout?: (event: any) => void;
        onRestyle?: (event: any) => void;
        onRedraw?: () => void;
        onAnimated?: () => void;
        revision?: number;
        divId?: string;
    }

    class Plot extends Component<PlotParams> {}
    export default Plot;
}
