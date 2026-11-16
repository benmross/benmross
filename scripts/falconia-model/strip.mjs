import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { prune } from '@gltf-transform/functions'
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer'
await MeshoptEncoder.ready; await MeshoptDecoder.ready
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder })
const doc = await io.read(process.argv[2])
for (const t of doc.getRoot().listTextures()) t.dispose()
for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) p.setAttribute('TEXCOORD_0', null)
await doc.transform(prune())
await io.write(process.argv[3], doc)
