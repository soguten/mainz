import { Component } from "mainz";

export class Counter extends Component<{ initial?: number }, { count: number }> {

    protected override initState() {
        return {
            count: this.props.initial ?? 0,
        };
    }

    override render() {
        const increment = () => {
            this.setState({ count: this.state.count + 1 });
        };

        return (
            <div className="wrap">
                <h1>Mainz Counter</h1>
                <p>Count: {this.state.count}</p>
                <button type="button" onClick={increment}>Increment</button>
            </div>
        );
    }
}