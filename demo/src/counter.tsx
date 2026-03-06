import { Component } from "mainz";

export class Counter extends Component<{ initial?: number }, { count: number }> {

    // static override styles = /*css*/`
    //     .wrap { font-family: system-ui; padding: 16px; }
    //     button { padding: 8px 12px; border-radius: 8px; }
    // `;

    override onMount() {
        this.setState({ count: this.props.initial ?? 0 });
    }

    render() {

        const inc = () => this.setState({ count: (this.state.count ?? 0) + 1 });

        return (
            <div className="wrap">
                <h1>Mainz Counter</h1>
                <p>Count: {this.state.count}</p>
                <button type="button" onClick={inc}>Increment</button>
            </div>
        );
    }
}