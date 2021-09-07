import { CompositeDisposable, Disposable } from "event-kit";
import { EditorSignals } from "../editor/EditorSignals";
import { Cancel, CancellablePromise } from "../util/Cancellable";

export type State<T> = { tag: 'none' } | { tag: 'executing', cb: (sv: T) => void, finish: () => void, cancel: () => void } | { tag: 'finished' }

export abstract class AbstractDialog<T> extends HTMLElement {
    private state: State<T> = { tag: 'none' };
    protected abstract readonly params: T;

    constructor(private readonly signals: EditorSignals) {
        super();
        this.render = this.render.bind(this);
        this.onChange = this.onChange.bind(this);
    }

    abstract render(): void;

    onChange(e: Event) {
        e.stopPropagation();
        switch (this.state.tag) {
            case 'executing':
                let value: any = undefined;
                if (e.target instanceof HTMLInputElement) {
                    if (e.target.type === 'checkbox')
                        value = e.target.checked;
                    else if (e.target.type === 'text')
                        value = e.target.value;
                    else if (e.target.type === 'radio')
                        value = e.target.value;
                } else if (e.target instanceof HTMLSelectElement) {
                    value = e.target.value;
                } else if (e.target instanceof HTMLElement && e.target.tagName == 'ISPACE-NUMBER-SCRUBBER') {
                    value = Number(e.target.getAttribute('value'));
                } else {
                    throw new Error("invalid precondition");
                }

                const key = e.target.getAttribute('name')!;
                if (/\./.test(key)) {
                    const [key1, key2] = key.split(/\./);
                    this.params[key1 as keyof T][key2 as keyof T[keyof T]] = value;
                } else {
                    this.params[key as keyof T] = value as unknown as T[keyof T];
                }
                this.state.cb(this.params);
                break;
            default: throw new Error('invalid state');
        }
    }

    execute(cb: (sv: T) => void) {
        return new CancellablePromise<void>((resolve, reject) => {
            const disposables = new CompositeDisposable();
            disposables.add(new Disposable(() => this.state = { tag: 'none' }));

            this.signals.dialogAdded.dispatch(this);
            disposables.add(new Disposable(() => this.signals.dialogRemoved.dispatch()));
            const cancel = () => {
                disposables.dispose();
                reject(Cancel);
            };
            const finish = () => {
                disposables.dispose();
                resolve();
            };
            this.state = { tag: 'executing', cb, finish, cancel };
            return { cancel, finish };
        });
    }

    finish() {
        switch (this.state.tag) {
            case 'executing': this.state.finish();
                this.state = { tag: 'finished' };
                break;
            case 'none': throw new Error('invalid precondition');
        }
    }

    cancel() {
        switch (this.state.tag) {
            case 'executing': this.state.cancel();
                break;
            case 'none': throw new Error('invalid precondition');
        }
    }

    connectedCallback() { this.render(); }
    disconnectedCallback() { }
}
