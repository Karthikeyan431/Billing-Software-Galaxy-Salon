import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../layouts/DashboardLayout';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useAuth } from '../hooks/useAuth';
import { courseService, studentService } from '../services/dataService';
import { formatCurrency, formatDate, cn } from '../utils/helpers';
import toast from 'react-hot-toast';

export default function AcademyPage() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState('courses');
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Course form
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [courseForm, setCourseForm] = useState({ courseName: '', duration: '', fee: '', description: '' });

  // Student form
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [studentForm, setStudentForm] = useState({ name: '', phone: '', email: '', course: '', fee: '' });

  // Fee payment
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [feeStudent, setFeeStudent] = useState(null);
  const [feeForm, setFeeForm] = useState({ amount: '', method: 'cash' });

  useEffect(() => {
    if (!authLoading && !user) { router.push('/login'); return; }
    if (user) loadData();
  }, [user, authLoading]);

  const loadData = async () => {
    try {
      const [cRes, sRes] = await Promise.all([courseService.getAll(), studentService.getAll({ limit: 100 })]);
      setCourses(cRes.data.courses);
      setStudents(sRes.data.students);
    } catch (err) {
      console.error('Failed to load academy data:', err);
      toast.error(err.response?.data?.error || 'Failed to load academy data');
    } finally { setLoading(false); }
  };

  // Course CRUD
  const submitCourse = async () => {
    if (!courseForm.courseName || !courseForm.fee) return toast.error('Required fields missing');
    try {
      if (editingCourse) {
        await courseService.update(editingCourse._id, courseForm);
      } else {
        await courseService.create(courseForm);
      }
      toast.success(editingCourse ? 'Course updated' : 'Course created');
      setShowCourseModal(false);
      setEditingCourse(null);
      loadData();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  // Student CRUD
  const submitStudent = async () => {
    if (!studentForm.name || !studentForm.phone || !studentForm.course) return toast.error('Required fields missing');
    try {
      const course = courses.find(c => c._id === studentForm.course);
      await studentService.create({ ...studentForm, courseName: course?.courseName, fee: studentForm.fee || course?.fee });
      toast.success('Student enrolled');
      setShowStudentModal(false);
      loadData();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  // Fee payment
  const submitFee = async () => {
    if (!feeForm.amount || feeForm.amount <= 0) return toast.error('Enter valid amount');
    try {
      await studentService.addFeePayment(feeStudent._id, feeForm);
      toast.success('Fee payment recorded');
      setShowFeeModal(false);
      setFeeStudent(null);
      loadData();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  // Certificate
  const issueCert = async (id) => {
    if (!window.confirm('Issue certificate to this student?')) return;
    try {
      await studentService.issueCertificate(id);
      toast.success('Certificate issued');
      loadData();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  if (authLoading || !user) return <LoadingSpinner />;

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">🎓 Beauty Academy</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('courses')} className={cn('px-4 py-2 rounded-lg text-sm font-medium', tab === 'courses' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600')}>Courses</button>
        <button onClick={() => setTab('students')} className={cn('px-4 py-2 rounded-lg text-sm font-medium', tab === 'students' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600')}>Students</button>
      </div>

      {loading ? <LoadingSpinner /> : tab === 'courses' ? (
        <>
          <div className="flex justify-end mb-4">
            {isAdmin && <Button onClick={() => { setEditingCourse(null); setCourseForm({ courseName: '', duration: '', fee: '', description: '' }); setShowCourseModal(true); }}>+ Add Course</Button>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map(c => (
              <div key={c._id} className="card">
                <h3 className="font-semibold text-gray-900 text-lg">{c.courseName}</h3>
                <p className="text-sm text-gray-500 mt-1">{c.description}</p>
                <div className="flex justify-between items-center mt-3">
                  <span className="text-sm text-gray-600">⏱ {c.duration}</span>
                  <span className="text-lg font-bold text-primary-700">{formatCurrency(c.fee)}</span>
                </div>
                {c.syllabus?.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-gray-500 mb-1">Syllabus:</p>
                    <div className="flex flex-wrap gap-1">
                      {c.syllabus.map((s, i) => <span key={i} className="badge bg-purple-50 text-purple-600">{s}</span>)}
                    </div>
                  </div>
                )}
                {isAdmin && (
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="secondary" onClick={() => { setEditingCourse(c); setCourseForm({ courseName: c.courseName, duration: c.duration, fee: c.fee, description: c.description || '' }); setShowCourseModal(true); }}>Edit</Button>
                    <Button size="sm" variant="ghost" className="text-red-600" onClick={async () => {
                      if (!window.confirm('Delete?')) return;
                      await courseService.delete(c._id); loadData();
                    }}>Delete</Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="flex justify-end mb-4">
            {isAdmin && <Button onClick={() => { setStudentForm({ name: '', phone: '', email: '', course: '', fee: '' }); setShowStudentModal(true); }}>+ Enroll Student</Button>}
          </div>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-3 font-medium">Name</th>
                  <th className="pb-3 font-medium">Phone</th>
                  <th className="pb-3 font-medium">Course</th>
                  <th className="pb-3 font-medium">Fee</th>
                  <th className="pb-3 font-medium">Paid</th>
                  <th className="pb-3 font-medium">Balance</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map(s => (
                  <tr key={s._id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-3 font-medium">{s.name}</td>
                    <td className="py-3">{s.phone}</td>
                    <td className="py-3">{s.courseName || s.course?.courseName}</td>
                    <td className="py-3">{formatCurrency(s.fee)}</td>
                    <td className="py-3 text-green-600 font-medium">{formatCurrency(s.feePaid)}</td>
                    <td className="py-3">
                      <span className={cn('font-medium', (s.fee - s.feePaid) > 0 ? 'text-red-600' : 'text-green-600')}>
                        {formatCurrency(s.fee - s.feePaid)}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={cn('badge', s.status === 'active' ? 'bg-green-100 text-green-700' : s.status === 'completed' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600')}>
                        {s.status}
                      </span>
                      {s.certificateIssued && <span className="badge bg-yellow-100 text-yellow-700 ml-1">🎓 Certified</span>}
                    </td>
                    <td className="py-3">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => { setFeeStudent(s); setFeeForm({ amount: '', method: 'cash' }); setShowFeeModal(true); }}>💰 Fee</Button>
                        {s.status === 'active' && !s.certificateIssued && isAdmin && (
                          <Button size="sm" variant="ghost" onClick={() => issueCert(s._id)}>🎓 Certificate</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {students.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-gray-400">No students enrolled</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Course Modal */}
      <Modal isOpen={showCourseModal} onClose={() => setShowCourseModal(false)} title={editingCourse ? 'Edit Course' : 'Add Course'}>
        <div className="space-y-3">
          <Input label="Course Name" value={courseForm.courseName} onChange={(e) => setCourseForm(f => ({ ...f, courseName: e.target.value }))} required />
          <Input label="Duration (e.g. 3 months)" value={courseForm.duration} onChange={(e) => setCourseForm(f => ({ ...f, duration: e.target.value }))} required />
          <Input label="Fee (₹)" type="number" value={courseForm.fee} onChange={(e) => setCourseForm(f => ({ ...f, fee: e.target.value }))} required />
          <Input label="Description" value={courseForm.description} onChange={(e) => setCourseForm(f => ({ ...f, description: e.target.value }))} />
          <Button onClick={submitCourse} className="w-full">{editingCourse ? 'Update' : 'Add'} Course</Button>
        </div>
      </Modal>

      {/* Student Modal */}
      <Modal isOpen={showStudentModal} onClose={() => setShowStudentModal(false)} title="Enroll Student">
        <div className="space-y-3">
          <Input label="Name" value={studentForm.name} onChange={(e) => setStudentForm(f => ({ ...f, name: e.target.value }))} required />
          <Input label="Phone" value={studentForm.phone} onChange={(e) => setStudentForm(f => ({ ...f, phone: e.target.value }))} required />
          <Input label="Email" type="email" value={studentForm.email} onChange={(e) => setStudentForm(f => ({ ...f, email: e.target.value }))} />
          <Select label="Course" value={studentForm.course} onChange={(e) => {
            const c = courses.find(c => c._id === e.target.value);
            setStudentForm(f => ({ ...f, course: e.target.value, fee: c?.fee || '' }));
          }}>
            <option value="">Select Course</option>
            {courses.map(c => <option key={c._id} value={c._id}>{c.courseName} - {formatCurrency(c.fee)}</option>)}
          </Select>
          <Input label="Fee (₹)" type="number" value={studentForm.fee} onChange={(e) => setStudentForm(f => ({ ...f, fee: e.target.value }))} />
          <Button onClick={submitStudent} className="w-full">Enroll Student</Button>
        </div>
      </Modal>

      {/* Fee Payment Modal */}
      <Modal isOpen={showFeeModal} onClose={() => setShowFeeModal(false)} title={`Fee Payment - ${feeStudent?.name}`} size="sm">
        <div className="space-y-3">
          {feeStudent && (
            <div className="bg-gray-50 p-3 rounded-lg text-sm">
              <p>Total Fee: {formatCurrency(feeStudent.fee)}</p>
              <p>Paid: {formatCurrency(feeStudent.feePaid)}</p>
              <p className="font-medium text-red-600">Balance: {formatCurrency(feeStudent.fee - feeStudent.feePaid)}</p>
            </div>
          )}
          <Input label="Amount (₹)" type="number" value={feeForm.amount} onChange={(e) => setFeeForm(f => ({ ...f, amount: e.target.value }))} required />
          <Select label="Payment Method" value={feeForm.method} onChange={(e) => setFeeForm(f => ({ ...f, method: e.target.value }))}>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="card">Card</option>
          </Select>
          <Button onClick={submitFee} className="w-full">Record Payment</Button>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
