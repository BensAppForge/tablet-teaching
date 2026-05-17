import {
	collection,
	getDocs,
	orderBy,
	query,
	Timestamp,
	where,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { firestore, functions } from "./config";

export interface Student {
	id: string; // == Firebase Auth uid
	teacherId: string;
	classId: string;
	firstName: string;
	lastInitial: string;
	synthEmail: string;
	active: boolean;
	createdAt?: Timestamp;
}

export interface CreatedCredential {
	uid: string;
	firstName: string;
	lastInitial: string;
	email: string;
	password: string;
}

export interface FailedStudent {
	firstName: string;
	lastInitial: string;
	error: string;
}

export interface BulkImportResponse {
	created: CreatedCredential[];
	failed: FailedStudent[];
}

const bulkImportStudentsFn = httpsCallable<
	{
		classId: string;
		students: { firstName: string; lastInitial: string }[];
	},
	BulkImportResponse
>(functions, "bulkImportStudents");

export async function bulkImportStudents(
	classId: string,
	students: { firstName: string; lastInitial: string }[]
): Promise<BulkImportResponse> {
	const res = await bulkImportStudentsFn({ classId, students });
	return res.data;
}

export async function getStudentsByClass(classId: string): Promise<Student[]> {
	const q = query(
		collection(firestore, "students"),
		where("classId", "==", classId),
		orderBy("createdAt", "asc")
	);
	const snap = await getDocs(q);
	return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Student));
}
