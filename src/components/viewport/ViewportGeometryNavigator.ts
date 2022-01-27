import * as THREE from "three";
import { ViewportNavigator, Orientation } from "./ViewportNavigator";
import * as visual from '../../visual_model/VisualModel';
import { OrbitControls } from "./OrbitControls";
import { DatabaseLike } from "../../editor/DatabaseLike";
import { point2point, vec2vec } from "../../util/Conversion";
import { ConstructionPlaneSnap } from "../../editor/snaps/Snap";

export class ViewportGeometryNavigator extends ViewportNavigator {
    constructor(
        private readonly db: DatabaseLike,
        controls: OrbitControls,
        container: HTMLElement,
        dim: number
    ) {
        super(controls, container, dim);
    }

    navigate(to: Orientation | visual.Face) {
        const { db } = this;
        let constructionPlane;
        if (to instanceof visual.Face) {
            const model = db.lookupTopologyItem(to);
            // model.UpdateSurfaceBounds(false);
            const placement = model.GetControlPlacement();
            model.OrientPlacement(placement);
            placement.Normalize(); // FIXME: for some reason necessary with curved faces
            const normal = vec2vec(placement.GetAxisY(), 1);
            const target = point2point(model.Point(0.5, 0.5));
            this.controls.target.copy(target);
            const n = this.animateToPositionAndQuaternion(normal, new THREE.Quaternion());
            constructionPlane = new ConstructionPlaneSnap(n, target);
        } else {
            const n = this.animateToOrientation(to);
            constructionPlane = new ConstructionPlaneSnap(n);
        }
        return constructionPlane;
    }
}
