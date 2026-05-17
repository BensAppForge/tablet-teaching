import {
	addDoc,
	collection,
	doc,
	getDoc,
	getDocs,
	orderBy,
	query,
	serverTimestamp,
	Timestamp,
	updateDoc,
	where,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { firestore, functions } from "./config";

export interface Class {
	id?: string;
	teacherId: string;
	name: string;
	archived: boolean;
	createdAt?: Timestamp;
	updatedAt?: Timestamp;
}

export async function createClass(
	teacherId: string,
	name: string
): Promise<string> {
	const trimmed = name.trim();
	if (!trimmed) throw new Error("Class name is required");

	const ref = await addDoc(collection(firestore, "classes"), {
		teacherId,
		name: trimmed,
		archived: false,
		createdAt: serverTimestamp(),
		updatedAt: serverTimestamp(),
	});
	return ref.id;
}

export async function getTeacherClasses(teacherId: string): Promise<Class[]> {
	const q = query(
		collection(firestore, "classes"),
		where("teacherId", "==", teacherId),
		orderBy("createdAt", "desc")
	);
	const snap = await getDocs(q);
	return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Class));
}

export async function getClass(classId: string): Promise<Class | null> {
	const snap = await getDoc(doc(firestore, "classes", classId));
	if (!snap.exists()) return null;
	return { id: snap.id, ...snap.data() } as Class;
}

export async function renameClass(classId: string, name: string): Promise<void> {
	const trimmed = name.trim();
	if (!trimmed) throw new Error("Class name is required");
	await updateDoc(doc(firestore, "classes", classId), {
		name: trimmed,
		updatedAt: serverTimestamp(),
	});
}

export async function setClassArchived(
	classId: string,
	archived: boolean
): Promise<void> {
	await updateDoc(doc(firestore, "classes", classId), {
		archived,
		updatedAt: serverTimestamp(),
	});
}

export interface DeleteClassResult {
	deletedStudentCount: number;
	classDeleted: boolean;
	failedStudents: { uid: string; error: string }[];
}

const deleteClassFn = httpsCallable<{ classId: string }, DeleteClassResult>(
	functions,
	"deleteClass"
);

/**
 * Cascading class delete. Removes every student (Auth + Firestore) and
 * then the class doc itself. Implemented as a Cloud Function because it
 * needs the Admin SDK to delete Auth users.
 */
export async function deleteClass(classId: string): Promise<DeleteClassResult> {
	const res = await deleteClassFn({ classId });
	return res.data;
}
