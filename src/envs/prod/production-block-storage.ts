import { Construct } from "constructs";
import { ApiObjectMetadata, Chart, ChartProps, Size } from "cdk8s";
import * as kplus from "cdk8s-plus-28";
import { KubeStorageClass } from "../../../imports/k8s";

export class ProductionBlockStorage extends Chart {
  public readonly volumeClaim: kplus.PersistentVolumeClaim;

  constructor(scope: Construct, id: string, props?: ChartProps) {
    super(scope, id, props);

    const storageClass = new KubeStorageClass(
      this,
      "oci-free-storage-class",
      {
        metadata: { name: "oci-free" },
        provisioner: "blockvolume.csi.oraclecloud.com",
        parameters: { vpusPerGB: "0" },
        reclaimPolicy: "Retain",
        volumeBindingMode: "WaitForFirstConsumer",
        allowVolumeExpansion: true,
      }
    );

    this.volumeClaim = new kplus.PersistentVolumeClaim(
      this,
      "global-data-volume-claim",
      {
        metadata: { name: "arthur-global-data" },
        storageClassName: storageClass.name,
        accessModes: [kplus.PersistentVolumeAccessMode.READ_WRITE_ONCE],
        storage: Size.gibibytes(50),
        volume: kplus.PersistentVolume.fromPersistentVolumeName(
          this,
          "pvc-hard-link",
          "csi-57c34efd-2ee2-48e8-9d30-6c960576bd44"
        ),
      }
    );
  }
}
