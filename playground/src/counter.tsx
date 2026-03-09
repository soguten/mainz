import { Component } from "mainz";

export class Counter extends Component<{ initial?: number }, { count: number }> {

    protected override initState() {
        return {
            count: this.props.initial ?? 0,
        };
    }

    private increment = () => {
        this.setState({ count: this.state.count + 1 });
    };

    override render() {
        return (
            <div className="wrap">
                <h1>Mainz Counter</h1>
                <p>Count: {this.state.count}</p>
                <button type="button" onClick={this.increment}>Increment</button>
            </div>
        );
    }
}
