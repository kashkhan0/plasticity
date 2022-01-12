import { Disposable } from 'event-kit';
import { render } from 'preact';
import Command from '../../command/Command';
import * as cmd from '../../commands/GeometryCommands';
import { Editor } from '../../editor/Editor';
import { DatabaseLike } from "../../editor/DatabaseLike";
import { HasSelection } from '../../selection/SelectionDatabase';
import { GConstructor } from '../../util/Util';
import { icons, tooltips } from './icons';

interface CommandList {
    sections: (typeof Command & GConstructor<Command>)[][];
    trash?: (typeof Command & GConstructor<Command>);
}

export class Model {
    constructor(
        private readonly selection: HasSelection,
        private readonly db: DatabaseLike
    ) { }

    get commands(): CommandList {
        const { selection } = this;

        const translations: Set<(typeof Command & GConstructor<Command>)> = new Set();
        const misc: Set<(typeof Command & GConstructor<Command>)> = new Set();
        const bool: Set<(typeof Command & GConstructor<Command>)> = new Set();
        let trash: (typeof Command & GConstructor<Command>) | undefined = undefined;

        if (selection.curves.size > 0 || selection.solids.size > 0 || selection.faces.size > 0 || selection.controlPoints.size > 0) {
            translations.add(cmd.MoveCommand);
        }
        if (selection.curves.size > 0 || selection.solids.size > 0 || selection.faces.size > 0 || selection.controlPoints.size > 0) {
            trash = cmd.DeleteCommand;
            translations.add(cmd.RotateCommand);
        }
        if (selection.curves.size > 0 || selection.solids.size > 0 || selection.controlPoints.size > 0) {
            translations.add(cmd.ScaleCommand);
        }
        if (selection.curves.size > 0 || selection.solids.size > 0 || selection.faces.size > 0) {
            misc.add(cmd.ShellCommand);
        }
        if (selection.curves.size > 0 || selection.solids.size > 0) {
            misc.add(cmd.MirrorCommand);
        }
        if (selection.regions.size > 0) {
            misc.add(cmd.ExtrudeCommand);
        }
        if (selection.solids.size > 0) {
            misc.add(cmd.RadialArrayCommand);
        }
        if (selection.solids.size > 1) {
            bool.add(cmd.UnionCommand);
            bool.add(cmd.IntersectionCommand);
            bool.add(cmd.DifferenceCommand);
        }
        if (selection.faces.size > 0) {
            misc.add(cmd.OffsetCurveCommand);
            misc.add(cmd.ExtrudeCommand);
            misc.add(cmd.ExtensionShellCommand);
        }
        if (selection.faces.size > 0 || selection.solids.size > 0) {
            bool.add(cmd.CutCommand);
        }
        if (selection.curves.size > 0) {
            misc.add(cmd.ExtrudeCommand);
            misc.add(cmd.RevolutionCommand);
            misc.add(cmd.OffsetCurveCommand);
        }
        if (selection.curves.size > 1) {
            misc.add(cmd.LoftCommand);
            misc.add(cmd.JoinCurvesCommand);
        }
        if (selection.edges.size > 0) {
            misc.add(cmd.FilletSolidCommand);
            misc.add(cmd.OffsetCurveCommand);
        }
        if (selection.edges.size > 0 || selection.curves.size > 0 || selection.solids.size > 0) {
            misc.add(cmd.DuplicateCommand);
        }
        if (selection.faces.size > 0) {
            misc.add(cmd.OffsetFaceCommand);
        }
        return { sections: [[...translations], [...misc], [...bool]], trash };
    }
}

export default (editor: Editor) => {
    class Tooltip extends HTMLElement {
        dispose?: Disposable

        constructor() {
            super();
            this.attachShadow({ mode: 'open' });
        }

        connectedCallback() {
            this.dispose = editor.tooltips.add(this.parentElement, {
                title: this.innerHTML,
                placement: this.getAttribute('placement') ?? undefined,
                keyBindingCommand: this.getAttribute('command'),
            });
        }

        disconnectedCallback() {
            this.dispose!.dispose();
        }
    }
    customElements.define('ispace-tooltip', Tooltip);

    class Toolbar extends HTMLElement {
        private readonly model = new Model(editor.selection.selected, editor.db);

        constructor() {
            super();
        }

        connectedCallback() {
            editor.signals.selectionChanged.add(this.render);
            this.render();
        }

        disconnectedCallback() {
            editor.signals.selectionChanged.remove(this.render);
        }

        render = () => {
            const { model: { commands: { sections, trash } } } = this;

            // preact's diffing algorithm will mutate ispace-tooltips rather than create new ones, which leads to corruption;
            // So, force things to be cleared first.
            render('', this);
            const result = (
                <div class="flex absolute bottom-2 left-1/2 flex-row space-x-2 -translate-x-1/2">
                    {
                        sections.map(section =>
                            <section class="flex flex-row space-x-0.5">
                                {
                                    section.map(command => {
                                        const tooltip = tooltips.get(command);
                                        if (!tooltip) console.error("invalid tooltip for " + command);
                                        return <plasticity-command name={command.identifier} class="shadow-lg first:rounded-l last:rounded-r overflow-clip"></plasticity-command>
                                    })
                                }
                            </section>
                        )
                    }
                    {
                        trash !== undefined &&
                        <plasticity-command name="delete" class="rounded-full overflow-clip"></plasticity-command>
                    }
                </div>
            );
            render(result, this);
        }

    }
    customElements.define('plasticity-toolbar', Toolbar);
}
