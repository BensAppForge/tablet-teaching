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

const updateStudentFn = httpsCallable<
	{ studentUid: string; firstName?: string; lastInitial?: string },
	{ ok: true }
>(functions, "updateStudent");

const deleteStudentFn = httpsCallable<{ studentUid: string }, { ok: true }>(
	functions,
	"deleteStudent"
);

export async function bulkImportStudents(
	classId: string,
	students: { firstName: string; lastInitial: string }[]
): Promise<BulkImportResponse> {
	const res = await bulkImportStudentsFn({ classId, students });
	return res.data;
}

export async function updateStudent(
	studentUid: string,
	updates: { firstName?: string; lastInitial?: string }
): Promise<void> {
	await updateStudentFn({ studentUid, ...updates });
}

export async function deleteStudent(studentUid: string): Promise<void> {
	await deleteStudentFn({ studentUid });
}

/**
 * Comparator for the students-list display order: last-name initial first
 * (case-insensitive, German-locale), then first name. Exported so callers
 * that locally mutate the list (after rename/delete) can keep it sorted
 * without a round-trip to Firestore.
 */
export function compareStudents(a: Student, b: Student): number {
	const initialCmp = a.lastInitial.localeCompare(b.lastInitial, "de", {
		sensitivity: "base",
	});
	if (initialCmp !== 0) return initialCmp;
	return a.firstName.localeCompare(b.firstName, "de", {
		sensitivity: "base",
	});
}

export async function getStudentsByClass(
	teacherId: string,
	classId: string
): Promise<Student[]> {
	// Both filters are required: classId scopes to the class, teacherId is
	// what the Firestore rule can prove against (lists can't depend on
	// resource.data.teacherId unless the query filters on it).
	const q = query(
		collection(firestore, "students"),
		where("teacherId", "==", teacherId),
		where("classId", "==", classId),
		orderBy("createdAt", "asc")
	);
	const snap = await getDocs(q);
	const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Student));
	return list.sort(compareStudents);
}
