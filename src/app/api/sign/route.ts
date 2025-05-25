import { CgPluginLibHost } from "@common-ground-dao/cg-plugin-lib-host";

const privateKey = process.env.NEXT_PRIVATE_PRIVKEY as string;
const publicKey = process.env.NEXT_PUBLIC_PUBKEY as string;

if (!privateKey || !publicKey) {
    throw new Error("Public or private key is not set in the .env file, please set it and try again.");
}

export async function POST(req: Request) {
    const body = await req.json();

    const cgPluginLibHost = await CgPluginLibHost.initialize(privateKey, publicKey);
    const { request, signature } = await cgPluginLibHost.signRequest(body);

    return Response.json({ request, signature });
}