/* This file has been automatically generated; do not edit */

package org.meshpoint.anode.stub.gen.user;

public class Org_webinos_api_discovery_StopCallback extends org.meshpoint.anode.js.JSInterface implements org.webinos.api.discovery.StopCallback {

	private static int classId = org.meshpoint.anode.bridge.Env.getInterfaceId(org.webinos.api.discovery.StopCallback.class);

	Org_webinos_api_discovery_StopCallback(long instHandle) { super(instHandle); }

	public void finalize() { super.release(classId); }

	private static Object[] __args = new Object[0];

	public void onStop() {
		__invoke(classId, 0, __args);
	}

}
