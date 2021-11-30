import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../visual_model/VisualModel';
import { point2point, curve3d2curve2d, vec2vec, composeMainName, unit, inst2curve } from '../../util/Conversion';
import { GeometryFactory, ValidationError } from '../GeometryFactory';

export default class LoftFactory extends GeometryFactory {
    private _curves!: visual.SpaceInstance<visual.Curve3D>[];
    private models!: { contour: c3d.Contour, placement: c3d.Placement3D }[];
    thickness = 0;

    private readonly names = new c3d.SNameMaker(composeMainName(c3d.CreatorType.CurveLoftedSolid, this.db.version), c3d.ESides.SideNone, 0);

    set curves(curves: visual.SpaceInstance<visual.Curve3D>[]) {
        this._curves = curves;
        const models = [];

        for (const curve of curves) {
            const instance = this.db.lookup(curve);
            const curve3d = inst2curve(instance)!;
            const planar = curve3d2curve2d(curve3d, new c3d.Placement3D());
            if (planar === undefined) throw new ValidationError("Curve cannot be converted to planar");
            const contour = new c3d.Contour([planar.curve], true);
            models.push({ contour, placement: planar.placement });
        }
        this.models = models;
    }

    get spine(): { point: THREE.Vector3, Z: THREE.Vector3 }[] {
        const points = [];
        for (const { contour, placement } of this.models) {
            const center = contour.GetWeightCentre();
            const point = placement.GetPointFrom(center.x, center.y, 0, c3d.LocalSystemType3D.CartesianSystem);
            points.push({ point: point2point(point), Z: vec2vec(placement.GetAxisZ(), 1) });
        }
        return points;
    }

    async calculate() {
        const { thickness, models, names } = this;

        const ns = [];
        for (const { contour } of models) {
            const maker = new c3d.SNameMaker(0, c3d.ESides.SidePlus, 0);
            ns.push(maker);
        }
        const params = new c3d.LoftedValues();
        params.thickness1 = unit(thickness);
        params.thickness2 = unit(thickness);
        params.shellClosed = true;
        const placements = models.map(m => m.placement);
        const contours = models.map(m => m.contour);
        const solid = c3d.ActionSolid.LoftedSolid(placements, contours, null, params, [], names, ns);
        return solid;
    }
}