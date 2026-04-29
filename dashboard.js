// =============================================
// منصة مهارات - Dashboard Logic
// =============================================

let allUsers = [], allCourses = [], allEnrollments = [], allCerts = [], allContacts = [], allPartners = [];
let editingCourseId = null, editingPartnerId = null;

// =============================================
// Auth Check
// =============================================
document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('currentDate').textContent = new Date().toLocaleDateString('ar-SA', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        alert('يجب تسجيل الدخول أولاً');
        window.location.href = 'rede.html#login';
        return;
    }

    const { data: profile } = await supabase
        .from('users').select('full_name, is_admin').eq('id', session.user.id).single();

    if (!profile || !profile.is_admin) {
        alert('ليس لديك صلاحية الدخول إلى لوحة التحكم');
        window.location.href = 'index.html';
        return;
    }

    document.getElementById('adminName').textContent = profile.full_name || session.user.email;
    loadStats();
    loadUsers();
    loadCourses();
    loadEnrollments();
    loadCerts();
    loadContacts();
    loadPartners();
});

// =============================================
// Navigation
// =============================================
function switchTab(tab) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById('tab-' + tab).classList.add('active');
    event.currentTarget.classList.add('active');
}

// =============================================
// Logout
// =============================================
async function logout() {
    await supabase.auth.signOut();
    window.location.href = 'index.html';
}

// =============================================
// Stats
// =============================================
async function loadStats() {
    const [users, courses, enrollments, certs, contacts] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase.from('courses').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('enrollments').select('id', { count: 'exact', head: true }),
        supabase.from('certificates').select('id', { count: 'exact', head: true }),
        supabase.from('contact_requests').select('id', { count: 'exact', head: true }).eq('status', 'new')
    ]);
    document.getElementById('statUsers').textContent = users.count ?? 0;
    document.getElementById('statCourses').textContent = courses.count ?? 0;
    document.getElementById('statEnrollments').textContent = enrollments.count ?? 0;
    document.getElementById('statCerts').textContent = certs.count ?? 0;
    document.getElementById('statContacts').textContent = contacts.count ?? 0;
}

// =============================================
// USERS
// =============================================
async function loadUsers() {
    const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
    if (error) { renderError('usersTableBody', error.message); return; }
    allUsers = data || [];
    renderUsers(allUsers);
}

function renderUsers(list) {
    if (!list.length) { document.getElementById('usersTableBody').innerHTML = emptyState('لا يوجد مستخدمون بعد'); return; }
    document.getElementById('usersTableBody').innerHTML = `
        <table>
            <thead><tr>
                <th>الاسم الكامل</th><th>البريد الإلكتروني</th>
                <th>الجوال</th><th>نوع الحساب</th><th>أدمن</th><th>تاريخ التسجيل</th><th>إجراءات</th>
            </tr></thead>
            <tbody>${list.map(u => `
                <tr>
                    <td><strong>${esc(u.full_name) || '—'}</strong></td>
                    <td>${esc(u.email)}</td>
                    <td>${esc(u.phone) || '—'}</td>
                    <td>${audienceBadge(u.user_type)}</td>
                    <td>${u.is_admin ? '<span class="badge badge-admin"><i class="fas fa-shield-alt"></i> أدمن</span>' : '—'}</td>
                    <td>${formatDate(u.created_at)}</td>
                    <td>
                        <button class="btn btn-sm ${u.is_admin ? 'btn-danger' : 'btn-success'}" onclick="toggleAdmin('${u.id}', ${u.is_admin})">
                            ${u.is_admin ? '<i class="fas fa-user-minus"></i> إلغاء أدمن' : '<i class="fas fa-user-shield"></i> جعله أدمن'}
                        </button>
                    </td>
                </tr>`).join('')}
            </tbody>
        </table>`;
}

function filterUsers(q) {
    const filtered = allUsers.filter(u =>
        u.full_name?.toLowerCase().includes(q.toLowerCase()) ||
        u.email?.toLowerCase().includes(q.toLowerCase())
    );
    renderUsers(filtered);
}

async function toggleAdmin(userId, current) {
    if (!confirm(current ? 'إلغاء صلاحية الأدمن؟' : 'منح صلاحية الأدمن لهذا المستخدم؟')) return;
    const { error } = await supabase.from('users').update({ is_admin: !current }).eq('id', userId);
    if (error) { alert('خطأ: ' + error.message); return; }
    loadUsers();
    loadStats();
}

// =============================================
// COURSES
// =============================================
async function loadCourses() {
    const { data, error } = await supabase.from('courses').select('*').order('display_order').order('created_at', { ascending: false });
    if (error) { renderError('coursesTableBody', error.message); return; }
    allCourses = data || [];
    if (allCourses.length === 0) {
        document.getElementById('seedBanner').style.display = 'flex';
    } else {
        document.getElementById('seedBanner').style.display = 'none';
    }
    renderCourses(allCourses);
    populateCourseSelect();
}

function renderCourses(list) {
    if (!list.length) { document.getElementById('coursesTableBody').innerHTML = emptyState('لا توجد دورات بعد'); return; }
    document.getElementById('coursesTableBody').innerHTML = `
        <table>
            <thead><tr>
                <th>#</th><th>اسم الدورة</th><th>الفئة</th><th>المدرب</th>
                <th>السعر</th><th>الحالة</th><th>الترتيب</th><th>إجراءات</th>
            </tr></thead>
            <tbody>${list.map((c, i) => `
                <tr>
                    <td>${i + 1}</td>
                    <td>
                        <div style="display:flex;align-items:center;gap:0.75rem">
                            <img src="${esc(c.image_url)}" style="width:45px;height:45px;object-fit:cover;border-radius:8px;" onerror="this.style.display='none'">
                            <strong>${esc(c.title)}</strong>
                        </div>
                    </td>
                    <td>${audienceBadge(c.target_audience)}</td>
                    <td>${esc(c.instructor_name) || '—'}</td>
                    <td>${c.is_free ? '<span class="badge badge-approved">مجاني</span>' : c.price + ' ر.س'}</td>
                    <td>${c.is_active ? '<span class="badge badge-approved"><i class="fas fa-check"></i> نشط</span>' : '<span class="badge badge-cancelled">معطل</span>'}</td>
                    <td>${c.display_order}</td>
                    <td style="display:flex;gap:0.4rem;flex-wrap:wrap">
                        <button class="btn btn-sm btn-outline" onclick="editCourse('${c.id}')"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-sm ${c.is_active ? 'btn-warning' : 'btn-success'}" onclick="toggleCourse('${c.id}', ${c.is_active})">
                            ${c.is_active ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>'}
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteCourse('${c.id}')"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>`).join('')}
            </tbody>
        </table>`;
}

function filterCourses(q) {
    renderCourses(allCourses.filter(c => c.title.toLowerCase().includes(q.toLowerCase())));
}

function openCourseModal(id) {
    editingCourseId = null;
    document.getElementById('courseModalTitle').textContent = 'إضافة دورة جديدة';
    document.getElementById('courseForm').reset();
    document.getElementById('courseTerms').value = 'شهادة معتمدة | مدة الدورة 5 ايام | بمعدل 40 ساعة تدريبية';
    document.getElementById('courseDuration').value = 5;
    document.getElementById('courseAudience').value = 'both';
    document.getElementById('coursePrice').value = 0;
    document.getElementById('courseOrder').value = allCourses.length;
    document.getElementById('courseModal').classList.add('active');
}

function closeCourseModal() {
    document.getElementById('courseModal').classList.remove('active');
    editingCourseId = null;
}

function editCourse(id) {
    const c = allCourses.find(x => x.id === id);
    if (!c) return;
    editingCourseId = id;
    document.getElementById('courseModalTitle').textContent = 'تعديل الدورة';
    document.getElementById('courseTitle').value = c.title || '';
    document.getElementById('courseDesc').value = c.description || '';
    document.getElementById('courseTerms').value = c.terms || '';
    document.getElementById('courseAxes').value = (c.axes || []).join('\n');
    document.getElementById('courseInstructor').value = c.instructor_name || '';
    document.getElementById('courseDuration').value = c.duration_days || 5;
    document.getElementById('courseAudience').value = c.target_audience || 'both';
    document.getElementById('courseStartDate').value = c.start_date || '';
    document.getElementById('courseImage').value = c.image_url || '';
    document.getElementById('courseCapacity').value = c.capacity || '';
    document.getElementById('coursePrice').value = c.price || 0;
    document.getElementById('courseRegUrl').value = c.registration_url || '';
    document.getElementById('courseOrder').value = c.display_order || 0;
    document.getElementById('courseModal').classList.add('active');
}

async function saveCourse(e) {
    e.preventDefault();
    const btn = document.getElementById('saveCourseBtn');
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';

    const axesText = document.getElementById('courseAxes').value;
    const axes = axesText.split('\n').map(a => a.trim()).filter(a => a.length > 0);
    const price = parseFloat(document.getElementById('coursePrice').value) || 0;

    const payload = {
        title: document.getElementById('courseTitle').value.trim(),
        description: document.getElementById('courseDesc').value.trim(),
        terms: document.getElementById('courseTerms').value.trim(),
        axes: axes,
        instructor_name: document.getElementById('courseInstructor').value.trim(),
        duration_days: parseInt(document.getElementById('courseDuration').value) || 5,
        target_audience: document.getElementById('courseAudience').value,
        start_date: document.getElementById('courseStartDate').value || null,
        image_url: document.getElementById('courseImage').value.trim(),
        capacity: parseInt(document.getElementById('courseCapacity').value) || null,
        price: price,
        is_free: price === 0,
        registration_url: document.getElementById('courseRegUrl').value.trim(),
        display_order: parseInt(document.getElementById('courseOrder').value) || 0
    };

    let error;
    if (editingCourseId) {
        ({ error } = await supabase.from('courses').update(payload).eq('id', editingCourseId));
    } else {
        ({ error } = await supabase.from('courses').insert(payload));
    }

    btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> حفظ الدورة';

    if (error) { alert('خطأ: ' + error.message); return; }
    closeCourseModal();
    loadCourses();
    loadStats();
}

async function toggleCourse(id, current) {
    const { error } = await supabase.from('courses').update({ is_active: !current }).eq('id', id);
    if (error) { alert('خطأ: ' + error.message); return; }
    loadCourses();
}

async function deleteCourse(id) {
    if (!confirm('حذف هذه الدورة نهائياً؟ سيتم حذف جميع التسجيلات المرتبطة بها.')) return;
    const { error } = await supabase.from('courses').delete().eq('id', id);
    if (error) { alert('خطأ: ' + error.message); return; }
    loadCourses();
    loadStats();
}

// =============================================
// SEED COURSES - نقل الدورات من الملفات
// =============================================
async function seedCourses() {
    if (!confirm('سيتم إضافة جميع الدورات الموجودة في الموقع إلى قاعدة البيانات. هل أنت متأكد؟')) return;

    const btn = event.currentTarget;
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري النقل...';

    const seedData = [
        { title: 'الذكاء الاصطناعي', image_url: 'img-maher/1.jpeg', description: 'إكساب المتدرب مهارات الذكاء الاصطناعي.', axes: ['المفاهيم الأساسية للذكاء الاصطناعي.','التعلم الآلي (Machine Learning).','التعلم العميق (Deep Learning).','الشبكات العصبية (Neural Networks).','معالجة اللغة الطبيعية (Natural Language Processing).','الروبوتات والتحكم الآلي.','خوارزميات الذكاء الاصطناعي المتقدمة.','تطبيقات الذكاء الاصطناعي في الصناعة.','الأخلاقيات والتحديات القانونية.','مستقبل الذكاء الاصطناعي.'] },
        { title: 'الأمن السيبراني', image_url: 'img-maher/2.png', description: 'إكساب المتدرب مهارات الأمن السيبراني والحماية من التهديدات الرقمية.', axes: ['أساسيات أمن المعلومات والجرائم الإلكترونية.','أنواع الهجمات الإلكترونية.','تحديد نقاط الضعف في الشبكات.','تقنيات اختبار أمان الشبكة.','المخاطر المرتبطة بنقل المعلومات.','تقنيات الدفاع الإلكتروني.','مهارات صد الهجمات الإلكترونية.','التعامل مع القضايا الأخلاقية والقانونية.','تقييم الاختراقات المحتملة.','حماية شبكات الحاسب.','مهارات إدارة مشاريع أمن المعلومات.','فهم التحقيق الجنائي الرقمي.'] },
        { title: 'تحليل البيانات', image_url: 'img-maher/3.jpg', description: 'إكساب المتدربين مهارات تحليل البيانات وتطبيقاتها.', axes: ['أنواع تحليل البيانات وأدواتها.','مهارات التعامل مع البيانات الضخمة.','مهارات تحليل الشبكات.','تحليل البيانات باستخدام الذكاء الاصطناعي.'] },
        { title: 'مهارات توظيف الأوفيس في العمل الإداري', image_url: 'img-maher/4.png', description: 'إكساب المتدرب مهارات توظيف الأوفيس في العمل الإداري.', axes: ['مقدمة عن استخدام برامج الأوفيس.','استخدام Word لإعداد الوثائق الإدارية.','استخدام Excel لإدارة البيانات.','استخدام PowerPoint لإنشاء عروض تقديمية.','إعداد البريد الإلكتروني باستخدام Outlook.','استخدام Access لإدارة قواعد البيانات.','اختصارات لوحة المفاتيح.','تنظيم الملفات والمجلدات.','حفظ المستندات وحمايتها.','التعامل مع المشكلات الشائعة.'] },
        { title: 'إدخال البيانات', image_url: 'img-maher/5.png', description: 'إكساب المتدربين مهارات إدخال البيانات وتطبيقاتها.', axes: ['مكونات جهاز الحاسب الآلي.','الجلسة الصحيحة للكتابة.','برنامج مدرب الطباعة.','إدخال البيانات بشكل سريع ودقيق.','فوائد توظيف تطبيقات الأوفيس.','الواجهات الرئيسة لتطبيق مايكروسوفت وورد.','مهارات استخدام مايكروسوفت وورد.'] },
        { title: 'إدارة المكاتب الإلكترونية', image_url: 'img-maher/6.png', description: 'إكساب المتدرب المهارات اللازمة للأعمال المكتبية الإلكترونية.', axes: ['مفهوم السكرتارية الحديثة.','مبادئ نظم المعلومات الإدارية.','مهارات التعامل مع المرؤوسين.','مهارات التعامل مع الرؤساء.','مهارات التعامل مع المراجعين.','مفهوم العلاقات العامة.','مهارات تجنب الأخطاء الإدارية.','مهارات إدارة الوقت.','الأرشفة الإلكترونية.'] },
        { title: 'إدارة المخاطر والأزمات', image_url: 'img-maher/7.png', description: 'إكساب المتدرب مهارات إدارة المخاطر والأزمات.', axes: ['ماهية المخاطر والأزمات.','خصائص المخاطر والأزمات.','حدوث المخاطر في بيئة العمل.','أنواع المخاطر والأزمات.','أسباب المخاطر وآثارها.','أسس مواجهة المخاطر والأزمات.','الإستراتيجيات المناسبة لإدارة المخاطر.','مسؤوليات فرق المخاطر.','آليات عمل فرق المخاطر.','خطط إدارة المخاطر.'] },
        { title: 'بناء وإدارة فرق العمل', image_url: 'img-maher/8.png', description: 'إكساب المتدرب مهارات بناء فرق العمل وإدارتها.', axes: ['مفهوم فريق العمل والمفاهيم الإدارية.','دورة ديناميكيات المجموعات.','إستراتيجيات إدارة فرق العمل.','الأدوات الإدارية لنجاح فريق العمل.','نقاط مهمة لبناء فريق العمل.','طرق تحفيز الفريق.','ممارسة الأدوات الإدارية.'] },
        { title: 'إدارة الموارد البشرية', image_url: 'img-maher/9.png', description: 'إكساب المتدرب مهارات إدارة الموارد البشرية.', axes: ['مقدمة في إدارة الموارد البشرية.','توظيف الموظفين واختيارهم.','تقييم الأداء وإدارته.','تطوير الموظفين وتدريبهم.','إدارة العلاقات العمالية.','تصميم الوظائف وتحليلها.','تخطيط الموارد البشرية.','إدارة التغيير والابتكار.','إدارة الأجور والمزايا.','إدارة الثقافة التنظيمية.'] },
        { title: 'إدارة الأزمات المالية', image_url: 'img-maher/10.png', description: 'إكساب المتدرب مهارات إدارة الأزمات المالية.', axes: ['مفهوم الأزمات المالية وتحليل أسبابها.','تقييم المخاطر المالية.','تطوير خطط الطوارئ المالية.','إدارة السيولة خلال الأزمات.','تقييم الأصول والالتزامات.','إستراتيجيات التعامل مع الديون.','أدوات رصد الأداء المالي.','خطط استعادة الكيان المالي.','تقييم الدروس المستفادة من الأزمات.'] },
        { title: 'إعداد التقارير المالية', image_url: 'img-maher/11.png', description: 'تنمية قدرات المتدربين على إعداد التقارير المالية.', axes: ['مفهوم التقارير المالية والتحليل المالي.','أهمية التحليل المالي.','أنواع التقارير المالية.','المفاهيم الأساسية في المحاسبة المالية.','تأثير الضرائب في التقارير المالية.','الشفافية في التقارير المالية.','دقة إعداد التقارير المالية.','فهم المخاطر المالية.','صناعة قرارات إستراتيجية.','إعداد التقارير وتطبيق التحليل المالي.'] },
        { title: 'إدارة المشاريع الاحترافية', image_url: 'img-maher/12.png', description: 'إكساب المتدرب مهارات إدارة المشاريع.', axes: ['مفهوم المشروع.','نطاق المشروع.','أنشطة المشروع.','إدارة المعنيين بالمشروع.','إدارة فريق العمل وتطويره.','إدارة المخاطر وتحليلها.','وضع خطة الاستجابة للمخاطر.','إدارة جودة المشاريع.'] },
        { title: 'القيادة التنظيمية في اتخاذ القرار', image_url: 'img-maher/13.png', description: 'تنمية مهارات المتدرب في مجال القيادة التنظيمية.', axes: ['اتجاهات فهم القيادة.','أنماط القيادة وخصائص القادة.','صناعة التأثير وتطبيق فنون القادة.','القيادة التحويلية.','القيادة الخادمة.','مشكلة ضعف القيادة وحلها.','تحليل دور القائد.','بناء منظومة العمل المؤسسي.','تأهيل قادة المستقبل.','اتخاذ القرارات الجريئة.'] },
        { title: 'النجاح الوظيفي وتنظيم وتطوير أساليب العمل', image_url: 'img-maher/14.png', description: 'إكساب المتدرب مهارات النجاح الوظيفي وتنظيم أساليب العمل.', axes: ['مفهوم النجاح الوظيفي.','مراحل الحياة الوظيفية.','الجانب التطويري والسلوكي للنجاح.','مهارات النجاح الوظيفي.','عوامل أساسية للنجاح الوظيفي.','الاستقرار في الوظيفة.','المفاهيم الحديثة في التنظيم والتطوير.','مهارات تبسيط الإجراءات.'] },
        { title: 'التطوير الإداري', image_url: 'img-maher/15.png', description: 'إكساب المتدرب مهارات التطوير الإداري.', axes: ['مفهوم التطوير الإداري وأهميته.','دور المديرين في تحليل احتياجات التطوير.','تصميم برامج التطوير وتنفيذها.','مهارات القيادة والإدارة.','الثقافة التنظيمية والقيم الإدارية.','اتخاذ القرارات الإستراتيجية.','الابتكار والإبداع في الإدارة.','إدارة التغيير المؤسسي.','تقييم نتائج التطوير الإداري.'] },
        { title: 'التخطيط الاستراتيجي', image_url: 'img-maher/16.png', description: 'إكساب المتدرب أهم المفاهيم في التخطيط الاستراتيجي.', axes: ['مفهوم التخطيط الإستراتيجي وأهدافه.','أساسيات التخطيط الإستراتيجي.','عناصر التخطيط الإستراتيجي.','أساليب التخطيط ومراحله.','تحليل البيئة الخارجية والداخلية.','تحديد رؤية المؤسسة ورسالتها.','وضع الأهداف الإستراتيجية.','مشكلات التخطيط الإستراتيجي.','خطوات التخطيط الإستراتيجي الفعال.'] },
        { title: 'الكتابة الوظيفية للمؤسسات والشركات', image_url: 'img-maher/17.png', description: 'إكساب المتدرب مهارات إعداد النماذج الإدارية وصياغتها.', axes: ['الاتصال والتواصل في الكتابة الوظيفية.','الكتابة الوظيفية والكتابة الإبداعية.','النماذج الإدارية المختلفة.','الصياغة اللغوية الصحيحة.','كتابة المحتوى الوظيفي.','كتابة المحاضر والتقارير الإدارية.','نظام المراسلات الإلكترونية.','أساسيات التواصل عبر البريد الإلكتروني.','آلية صياغة الردود الرسمية.'] },
        { title: 'خدمة العملاء', image_url: 'img-maher/18.png', description: 'إكساب المتدرب مفاهيم خدمة العملاء ومهارات التواصل.', axes: ['أساليب الاتصال وعناصره.','أنواع الاتصال ومكوناته.','مهارات الإنصات الجيد.','مهارات الحديث والتعامل.','مهارات الحوار مع الآخرين.','لغة الجسد في الاتصال.','مفهوم خدمة العملاء.','إستراتيجيات التميز في خدمة العملاء.','طبيعة التسويق والعلاقات العامة.'] },
        { title: 'استخدام نموذج الجودة الأوروبي EFQM', image_url: 'img-maher/19.png', description: 'إكساب المتدربين مهارات تطبيق نموذج الجودة الأوروبي.', axes: ['التميز في أداء المؤسسات.','أهمية نموذج الجودة الأوروبي EFQM.','مكونات نموذج الجودة الأوروبي.','المعايير الأساسية للنموذج.','الدول التي تتبنى النموذج.','آليات إدارة التميز.','نظام تقييم المؤسسات.','تقييم المؤسسات وتطويرها.','تحديات التميز والجودة.'] },
        { title: 'أحكام نظام العمل السعودي', image_url: 'img-maher/20.png', description: 'إكساب المتدرب أحكام نظام العمل السعودي وتعديلاته.', axes: ['الأحكام العامة لعقد العمل.','صياغة عقد العمل.','الجوانب القانونية لانتهاء العلاقة العمالية.','تطبيقات قضائية على حالات عملية.'] },
        { title: 'المسؤولية القانونية للممارسات الصحية', image_url: 'img-maher/21.png', description: 'إكساب المتدرب معارف خاصة بالمسؤولية القانونية في المهن الصحية.', axes: ['اختصاصات الهيئة الصحية الشرعية.','نظام التأمين التعاوني ضد الأخطاء الطبية.','الضوابط الشرعية لإجراء التجارب الطبية.','الأخطاء المهنية الصحية وحق التعويض.','الأعمال الطبية دون مسؤولية قانونية.'] },
        { title: 'الأمن الصناعي', image_url: 'img-maher/22.png', description: 'إكساب المتدرب مهارات الأمن الصناعي والصحة والسلامة.', axes: ['مفهوم الأمان والسلامة.','أهداف السلامة وأهميتها.','إجراءات السلامة وواجباتها.','مهام حارس السلامة.','لوائح السلامة واشتراطاتها.','الوقاية ومكافحة الحرائق.','تصنيف المخاطر وتحليلها.','ضغوط العمل ومهارات التعامل معها.'] },
        { title: 'الصحة والسلامة المهنية OSHA', image_url: 'img-maher/23.png', description: 'إكساب المتدرب مهارات الصحة والسلامة المهنية.', axes: ['أهداف برنامج السلامة والصحة المهنية.','طرق الوقاية من الحوادث.','أنواع الحوادث والإصابات.','دور مسؤول السلامة.','أنواع المخاطر وطرق تجنبها.','التخطيط لمنع الحوادث.','أنواع الحرائق والطفايات.','تحليل المخاطر في بيئة العمل.','خطة الإخلاء والطوارئ.'] },
        { title: 'دمج التقنية في التعليم والتدريب', image_url: 'img-maher/24.png', description: 'إكساب المتدرب المهارات الخاصة بدمج التكنولوجيا في التعليم.', axes: ['البيئة التعليمية وأنواعها.','التحولات التي عجلت بدمج التكنولوجيا.','نماذج دمج التكنولوجيا في التعليم.','المستحدثات التكنولوجية والقاعات الذكية.','التعليم الإلكتروني وأشكاله.','الوسائط المتعددة في التعليم.','الفصول الافتراضية وأنواعها.','التعليم المتنقل.','الواقع المعزز في التعليم.'] },
        { title: 'التعليم الإلكتروني في مواجهة الأزمات والمخاطر', image_url: 'img-maher/25.png', description: 'إكساب المتدرب مهارات التعليم الإلكتروني في الأزمات.', axes: ['مفهوم الأزمات والكوارث.','مواجهة الأزمات في المؤسسات التعليمية.','أساليب الاستجابة للأزمات.','أسس إدارة الأزمات التعليمية.','التعليم عن بعد في الأزمات.','مفهوم التعليم الإلكتروني ومميزاته.','أنواع أنظمة إدارة التعلم.','استخدام Moodle و Blackboard.'] },
        { title: 'إدارة البيئة الصفية', image_url: 'img-maher/26.png', description: 'إكساب المتدرب مهارات إدارة البيئة الصفية.', axes: ['مفهوم الإدارة الصفية وتطبيقاتها.','مفهوم إدارة بيئة التعلم.','أهمية الإدارة الصفية الفعالة.','معايير الإدارة الصفية الناجحة.','العوامل المؤثرة في الإدارة الصفية.','المشكلات الصفية وأساليب التعامل معها.','إجراءات تنفيذ الدرس.'] },
        { title: 'تصميم وإنتاج المحتوى الرقمي', image_url: 'img-maher/27.png', description: 'إكساب المتدرب مهارات صناعة المحتوى الرقمي.', axes: ['مفهوم الاتصال ومرتكزات التعلم.','أنواع المحتوى الرقمي.','الأدوات والحلول الرقمية.','التعامل مع مهارات صناعة المحتوى.','أدوات تحليل التفاعل الرقمي.','مهارات تحليل البيانات.','دور الذكاء الاصطناعي في المحتوى.','تحديد مصفوفة المحتوى الرقمي.'] },
        { title: 'تصميم وإنتاج الكتاب الإلكتروني التفاعلي', image_url: 'img-maher/28.png', description: 'إكساب المتدرب مهارات تصميم الكتاب الإلكتروني وإنتاجه.', axes: ['مفاهيم الكتاب الإلكتروني التفاعلي.','تاريخ تطور الكتاب الإلكتروني.','مميزات الكتاب الإلكتروني.','معايير تصميم الكتاب الإلكتروني.','أشهر تطبيقات الإنتاج.','التصميم باستخدام نموذج ADDIE.','الإنتاج باستخدام Flip PDF.'] },
        { title: 'التعليم النشط', image_url: 'img-maher/29.png', description: 'إكساب المتدرب مهارات التعلم النشط.', axes: ['مفهوم التعلم النشط.','أسس التعلم النشط وعوائده.','عوائق التعلم النشط.','دور كل من المعلم والمتعلم.','إستراتيجيات التعلم النشط.','طريقة تطبيق الإستراتيجيات.','كيف تصبح متعلماً نشطاً.'] },
        { title: 'استخدام أدوات جوجل في التعليم', image_url: 'img-maher/30.png', description: 'إكساب المتدرب الأسس والمهارات في استخدام أدوات جوجل التعليمية.', axes: ['مفهوم تطبيقات جوجل التعليمية.','استخدام أبرز تطبيقات جوجل.','Gmail, Google Drive, Google Classroom.','Google Forms, Google Sites.','Google Scholar, Google Meet.'] },
        { title: 'التعليم عبر الجوال والأجهزة اللوحية', image_url: 'img-maher/31.png', description: 'تمكين المتدرب من اكتساب مهارات التعليم عبر الجوال.', axes: ['تعريف التعليم باستخدام الجوال.','التطور التاريخي للتعليم المتنقل.','مميزات التعليم عبر الجوال.','تحديات التعليم المتنقل.','تطبيقات التعليم عبر الجوال.','التصميم التعليمي للتعليم المتنقل.','نموذج تصميم التعليم ADDIE.'] },
        { title: 'التقويم من أجل التعليم', image_url: 'img-maher/32.png', description: 'إكساب المتدرب مهارات التقويم من أجل التعليم.', axes: ['مفهوم التقويم وأساليبه.','مبادئ التقويم في التعليم.','الفرق بين التقويم التربوي والتعليمي.','طرق التقويم وأدواته.','مواصفات التقويم الجيد.'] },
        { title: 'تصميم وإنتاج الواقع المعزز', image_url: 'img-maher/33.png', description: 'إكساب المتدرب المهارات العملية في إنتاج الواقع المعزز.', axes: ['الواقع المعزز وخصائصه.','النظريات التربوية للواقع المعزز.','أهمية تقنية الواقع المعزز.','أنواع الواقع المعزز.','الفرق بين الواقع المعزز والافتراضي.','استخدام الواقع المعزز في التعليم.','وسائل وتطبيقات الواقع المعزز.','مشروع تطبيقي.'] },
        { title: 'مهارات التدريس الفعال', image_url: 'img-maher/34.png', description: 'إكساب المتدرب مهارات التدريس الفعال.', axes: ['مفهوم التدريس الفعال وأبعاده.','خصائص التدريس الفعال وشروطه.','صفات المعلم الفعال.','مهارات التدريس الفعال.','القدرة على تسيير الدرس.','مهارات التعزيز وإثارة الدافعية.','تقييم فعالية التدريس.','الإستراتيجيات الحديثة للتعلم.','خطوات التدريس الإبداعي.'] },
        { title: 'إدارة عمليات التفتيش والرقابة', image_url: 'img-maher/35.png', description: 'إكساب المتدربين المعارف اللازمة للمفتشين والمراقبين.', axes: ['المفاهيم الأساسية في التفتيش والرقابة.','الحياد والنزاهة والاستقلال.','مفهوم عملية التفتيش.','أهداف عملية التفتيش.','السياسات التنظيمية للتفتيش.','معايير الجودة في التفتيش.','المهارات الواجبة في فريق التفتيش.','الأساليب الحديثة في التفتيش.','مهارات إعداد خطة التفتيش.','التحديات التي تواجه التفتيش.'] },
        { title: 'مكافحة الاحتيال المصرفي', image_url: 'img-maher/36.png', description: 'إكساب المتدربين مهارات مكافحة جرائم الاحتيال المصرفي.', axes: ['الاحتيال المصرفي وأنواعه.','الأسباب المسهمة في الاحتيال.','الأطر القانونية المتعلقة بمكافحة الاحتيال.','أدوار موظفي المصرف.','إجراءات العناية الواجبة KYC.','مؤشرات الإنذار المبكر.','تحليل أساليب الاحتيال الشائعة.','آليات الرقابة الداخلية.','التعامل مع الحالات المشبوهة.','توثيق الحالات المشبوهة.'] },
        { title: 'الجودة الشاملة', image_url: 'img-maher/37.png', description: 'إكساب المتدربين مهارات ومعارف تطبيق مبادئ الجودة الشاملة.', axes: ['مفهوم الجودة الشاملة.','أسس الإدارة الإستراتيجية لتحسين الجودة.','أدوات تقييم الجودة الشاملة.','الاتجاهات العالمية في الجودة.','المهارات الأساسية لتطبيق الجودة.','إستراتيجيات تحسين الأداء المؤسسي.','دراسة الحالات وأفضل الممارسات.','صياغة إستراتيجيات قائمة على الجودة.'] },
        { title: 'مكافحة الفساد الإداري والمالي', image_url: 'img-maher/38.png', description: 'إكساب المتدربين مهارات مكافحة الفساد الإداري والمالي.', axes: ['مفهوم الفساد المالي والإداري وأسبابه.','أثر الفساد على الجوانب الاقتصادية.','الحكم الصالح ومبادئه.','المساءلة المجتمعية وأدواتها.','الفساد وأخلاقيات العمل.','عوامل الوقاية من الفساد.','الرقابة في المؤسسات.','أنواع الرقابة الداخلية والخارجية.','إستراتيجيات مكافحة الفساد.'] },
        { title: 'مؤشرات قياس الأداء KPIs', image_url: 'img-maher/39.png', description: 'تزويد المشاركين بالمعرفة اللازمة لفهم مؤشرات الأداء وتطبيقها.', axes: ['مفهوم مؤشرات الأداء وأهميتها.','أنواع مؤشرات الأداء.','الفرق بين KPIs والعوامل الحرجة.','العلاقة بين الأهداف والمخاطر والمؤشرات.','الخطوات المنهجية لتصميم المؤشرات.','إعداد الجداول العملية للمؤشرات.','آليات جمع بيانات المؤشرات.','تمثيل نتائج المؤشرات بيانياً.','دمج مؤشرات الأداء في العمليات.'] },
        { title: 'إدارة المبيعات والمشتريات', image_url: 'img-maher/40.png', description: 'إكساب المتدرب المهارات اللازمة لشغل وظائف المبيعات والمشتريات.', axes: ['مقدمة إلى المبيعات والمشتريات.','مهارات التواصل والتفاوض.','التكنولوجيا في المبيعات.','التجارة الإلكترونية والمبيعات الرقمية.','إدارة العلاقات مع العملاء والموردين.','المهارات المالية في المبيعات.','إدارة الجودة وخدمة العملاء.','التطبيقات العملية والتحضير للتوظيف.'] },
        { title: 'إدارة المطاعم', image_url: 'img-maher/41.png', description: 'إكساب المتدرب المهارات اللازمة لشغل وظائف إدارية في المطاعم.', axes: ['تخطيط الأعمال وتنظيم المطعم.','إدارة العمليات اليومية.','التغذية وسلامة الأغذية.','التسويق والعلاقات العامة.','الخدمة وتجربة العملاء.','إدارة الموارد البشرية.','التمويل والمحاسبة.','القوانين والتشريعات.','التطوير والابتكار المستمر.'] },
        { title: 'إدارة الفنادق', image_url: 'img-maher/42.png', description: 'إكساب المتدرب المهارات اللازمة لشغل الوظائف الإدارية في الفنادق.', axes: ['مقدمة في إدارة الفنادق.','التخطيط والتنظيم الفندقي.','إدارة الخدمات الفندقية.','التسويق والبيع في القطاع الفندقي.','إدارة الموارد البشرية في الفنادق.','إدارة الجودة والرضا الفندقي.','التكنولوجيا في إدارة الفنادق.','الأمن والسلامة في الفنادق.','الاستدامة والمسؤولية الاجتماعية.'] },
        { title: 'منسق فعاليات', image_url: 'img-maher/43.png', description: 'إكساب المتدرب المهارات اللازمة لشغل وظيفة منسق فعاليات.', axes: ['التخطيط المبدئي وإعداد الجدول الزمني.','إدارة الميزانية والموارد.','اختيار المكان والتنسيق اللوجستي.','التسويق والترويج.','تقنيات التسجيل وإدارة الجمهور.','إدارة المتحدثين والمحتوى.','التكنولوجيا والأدوات الحديثة.','التقييم والمتابعة بعد الفعالية.'] },
        { title: 'الباريستا', image_url: 'img-maher/44.png', description: 'إكساب المتدرب المهارات اللازمة لشغل وظيفة الباريستا.', axes: ['تاريخ القهوة ومصادرها.','معرفة القهوة المختصة.','التخزين الصحيح للقهوة.','تذوق النكهات.','إتقان طرق التحضير.','تحضير الإسبريسو.','اختيار الماء المناسب.','تبخير الحليب وتكوين اللاتيه آرت.','مهارات الباريستا المحترف.','إدارة المقهى.'] },
        { title: 'مشغل ألعاب ترفيهية', image_url: 'img-maher/45.png', description: 'إكساب المتدرب المهارات اللازمة لشغل وظيفة مشغل ألعاب ترفيهية.', axes: ['مفهوم السياحة.','شركات الألعاب الترفيهية.','قواعد نظام العمل في شركات الألعاب.','تطبيق عملي على تشغيل الألعاب.','أسس الأمن والسلامة.','أنواع الألعاب الترفيهية.','تكنولوجيا الألعاب الإلكترونية.','إدارة منصات الألعاب.'] },
        { title: 'إدارة بيوت الثقافة', image_url: 'img-maher/46.png', description: 'إكساب المتدرب المهارات اللازمة لإدارة بيوت الثقافة.', axes: ['بيوت الثقافة وأهدافها.','تأثير بيوت الثقافة في التنمية.','دور المسرح والفنون في نشر الثقافة.','مفهوم الهوية الثقافية.','سمات الإدارة الناجحة.','التخطيط الإستراتيجي لبيوت الثقافة.','مفهوم الجودة الشاملة.','إستراتيجيات إدارة الكوادر البشرية.','الملكية الفكرية وحقوق المؤلف.','أسس التسويق الثقافي.'] },
        { title: 'المبيعات الهاتفية', image_url: 'img-maher/47.png', description: 'إكساب المتدرب المهارات اللازمة لشغل وظيفة المبيعات الهاتفية.', axes: ['مفهوم المبيعات الهاتفية وأهميتها.','مهارات التواصل الفعال والاستماع النشط.','مهارات الإقناع والتأثير.','إدارة الوقت وتنظيم الجداول.','التخطيط المسبق ومعرفة الجمهور.','صياغة السيناريوهات البيعية.','مهارة بناء الثقة مع العملاء.','تحليل احتياجات العميل.','التعامل مع الاعتراضات البيعية.','بناء علاقات طويلة المدى.','استخدام برامج CRM.'] },
        { title: 'مشرف السكن الجماعي', image_url: 'img-maher/48.png', description: 'إكساب المتدرب المهارات اللازمة لشغل وظيفة مشرف سكن جماعي.', axes: ['مفاهيم السكن وأهميته.','الحق في السكن اللائق.','أنواع السكن واحتياجاته.','مفهوم السكن الجماعي.','تصنيف السكن الجماعي ومهام المشرف.','الشروط الصحية والفنية للسكن.','متطلبات ترخيص السكن الجماعي.','متطلبات الوقاية من الحرائق.','لائحة المخالفات والغرامات.','تطبيق المهارات الإدارية والقيادية.'] },
        { title: 'مشرف مهارات البيع لمنتجات التغذية واللياقة', image_url: 'img-maher/49.png', description: 'إكساب المتدربين المهارات اللازمة لبيع منتجات التغذية واللياقة.', axes: ['تصنيف المنتجات الصحية والمكملات الغذائية.','آليات عمل منتجات إنقاص الوزن.','أنواع مكملات البروتين والأحماض الأمينية.','مكونات الغذاء الأساسية.','مبادئ التغذية الصحية في إدارة الوزن.','مهارات التواصل الفعال مع العملاء.','إعداد حلول واستشارات مخصصة.'] }
    ];

    const records = seedData.map((c, i) => ({
        title: c.title,
        description: c.description,
        terms: 'شهادة معتمدة | مدة الدورة 5 ايام | بمعدل 40 ساعة تدريبية',
        axes: c.axes,
        image_url: c.image_url,
        target_audience: 'both',
        is_free: true,
        price: 0,
        duration_days: 5,
        is_active: true,
        display_order: i
    }));

    const { error } = await supabase.from('courses').insert(records);
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-database"></i> نقل الدورات تلقائياً';

    if (error) { alert('خطأ أثناء النقل: ' + error.message); return; }
    alert(`تم نقل ${records.length} دورة إلى قاعدة البيانات بنجاح!`);
    loadCourses();
    loadStats();
}

// =============================================
// ENROLLMENTS
// =============================================
async function loadEnrollments() {
    const { data, error } = await supabase
        .from('enrollments')
        .select('*, users(full_name, email), courses(title)')
        .order('enrolled_at', { ascending: false });
    if (error) { renderError('enrollmentsTableBody', error.message); return; }
    allEnrollments = data || [];
    renderEnrollments(allEnrollments);
}

function renderEnrollments(list) {
    if (!list.length) { document.getElementById('enrollmentsTableBody').innerHTML = emptyState('لا توجد تسجيلات بعد'); return; }
    document.getElementById('enrollmentsTableBody').innerHTML = `
        <table>
            <thead><tr>
                <th>اسم المستخدم</th><th>البريد الإلكتروني</th>
                <th>الدورة</th><th>تاريخ التسجيل</th><th>الحالة</th><th>إجراءات</th>
            </tr></thead>
            <tbody>${list.map(e => `
                <tr>
                    <td><strong>${esc(e.users?.full_name) || '—'}</strong></td>
                    <td>${esc(e.users?.email) || '—'}</td>
                    <td>${esc(e.courses?.title) || '—'}</td>
                    <td>${formatDate(e.enrolled_at)}</td>
                    <td>${statusBadge(e.status)}</td>
                    <td>
                        <select class="table-search" style="min-width:130px;padding:0.4rem" onchange="updateEnrollmentStatus('${e.id}', this.value)">
                            <option value="pending" ${e.status==='pending'?'selected':''}>معلق</option>
                            <option value="approved" ${e.status==='approved'?'selected':''}>مقبول</option>
                            <option value="completed" ${e.status==='completed'?'selected':''}>مكتمل</option>
                            <option value="cancelled" ${e.status==='cancelled'?'selected':''}>ملغي</option>
                        </select>
                    </td>
                </tr>`).join('')}
            </tbody>
        </table>`;
}

function filterEnrollments(status) {
    renderEnrollments(status ? allEnrollments.filter(e => e.status === status) : allEnrollments);
}

async function updateEnrollmentStatus(id, status) {
    const { error } = await supabase.from('enrollments').update({ status }).eq('id', id);
    if (error) alert('خطأ: ' + error.message);
    else loadEnrollments();
}

// =============================================
// CERTIFICATES
// =============================================
async function loadCerts() {
    const { data, error } = await supabase
        .from('certificates')
        .select('*, users(full_name, email), courses(title)')
        .order('issued_at', { ascending: false });
    if (error) { renderError('certsTableBody', error.message); return; }
    allCerts = data || [];
    renderCerts(allCerts);
}

function renderCerts(list) {
    if (!list.length) { document.getElementById('certsTableBody').innerHTML = emptyState('لا توجد شهادات مُصدرة بعد'); return; }
    document.getElementById('certsTableBody').innerHTML = `
        <table>
            <thead><tr>
                <th>اسم المتدرب</th><th>البريد الإلكتروني</th>
                <th>الدورة</th><th>رقم الشهادة</th><th>تاريخ الإصدار</th><th>إجراءات</th>
            </tr></thead>
            <tbody>${list.map(c => `
                <tr>
                    <td><strong>${esc(c.users?.full_name) || '—'}</strong></td>
                    <td>${esc(c.users?.email) || '—'}</td>
                    <td>${esc(c.courses?.title) || '—'}</td>
                    <td><code>${esc(c.certificate_number)}</code></td>
                    <td>${formatDate(c.issued_at)}</td>
                    <td>
                        <button class="btn btn-sm btn-danger" onclick="deleteCert('${c.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>`).join('')}
            </tbody>
        </table>`;
}

async function deleteCert(id) {
    if (!confirm('حذف هذه الشهادة نهائياً؟')) return;
    const { error } = await supabase.from('certificates').delete().eq('id', id);
    if (error) alert('خطأ: ' + error.message);
    else { loadCerts(); loadStats(); }
}

function openIssueCertModal() {
    populateCourseSelect();
    document.getElementById('certModal').classList.add('active');
}

async function issueCertificate(e) {
    e.preventDefault();
    const email = document.getElementById('certUserEmail').value.trim();
    const courseId = document.getElementById('certCourseId').value;

    const { data: users } = await supabase.from('users').select('id, full_name').eq('email', email).single();
    if (!users) { alert('لم يتم إيجاد مستخدم بهذا البريد الإلكتروني.'); return; }

    const certNum = 'CERT-' + new Date().getFullYear() + '-' + Math.floor(Math.random() * 900000 + 100000);
    const { error } = await supabase.from('certificates').insert({
        user_id: users.id,
        course_id: courseId,
        certificate_number: certNum
    });

    if (error) { alert('خطأ: ' + error.message); return; }
    alert(`تم إصدار الشهادة بنجاح!\nرقم الشهادة: ${certNum}`);
    document.getElementById('certModal').classList.remove('active');
    document.getElementById('certForm').reset();
    loadCerts();
    loadStats();
}

function populateCourseSelect() {
    const sel = document.getElementById('certCourseId');
    if (!sel) return;
    sel.innerHTML = '<option value="">اختر دورة...</option>' +
        allCourses.map(c => `<option value="${c.id}">${esc(c.title)}</option>`).join('');
}

// =============================================
// CONTACTS
// =============================================
async function loadContacts() {
    const { data, error } = await supabase
        .from('contact_requests')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) { renderError('contactsTableBody', error.message); return; }
    allContacts = data || [];
    renderContacts(allContacts);
}

function renderContacts(list) {
    if (!list.length) { document.getElementById('contactsTableBody').innerHTML = emptyState('لا توجد طلبات تواصل بعد'); return; }
    document.getElementById('contactsTableBody').innerHTML = `
        <table>
            <thead><tr>
                <th>الاسم</th><th>البريد الإلكتروني</th>
                <th>الجوال</th><th>الرسالة</th><th>التاريخ</th><th>الحالة</th><th>إجراءات</th>
            </tr></thead>
            <tbody>${list.map(c => `
                <tr>
                    <td><strong>${esc(c.name)}</strong></td>
                    <td>${esc(c.email)}</td>
                    <td>${esc(c.phone) || '—'}</td>
                    <td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
                        title="${esc(c.message)}">${esc(c.message)}</td>
                    <td>${formatDate(c.created_at)}</td>
                    <td>${contactBadge(c.status)}</td>
                    <td>
                        <select class="table-search" style="min-width:120px;padding:0.4rem" onchange="updateContactStatus('${c.id}', this.value)">
                            <option value="new" ${c.status==='new'?'selected':''}>جديد</option>
                            <option value="read" ${c.status==='read'?'selected':''}>مقروء</option>
                            <option value="replied" ${c.status==='replied'?'selected':''}>تم الرد</option>
                        </select>
                    </td>
                </tr>`).join('')}
            </tbody>
        </table>`;
}

function filterContacts(status) {
    renderContacts(status ? allContacts.filter(c => c.status === status) : allContacts);
}

async function updateContactStatus(id, status) {
    const { error } = await supabase.from('contact_requests').update({ status }).eq('id', id);
    if (error) alert('خطأ: ' + error.message);
    else { loadContacts(); loadStats(); }
}

// =============================================
// PARTNERS
// =============================================
async function loadPartners() {
    const { data, error } = await supabase.from('partners').select('*').order('display_order');
    if (error) { renderError('partnersTableBody', error.message); return; }
    allPartners = data || [];
    renderPartners(allPartners);
}

function renderPartners(list) {
    if (!list.length) { document.getElementById('partnersTableBody').innerHTML = emptyState('لا يوجد شركاء بعد'); return; }
    document.getElementById('partnersTableBody').innerHTML = `
        <table>
            <thead><tr>
                <th>الشعار</th><th>الاسم</th><th>الموقع</th><th>الترتيب</th><th>الحالة</th><th>إجراءات</th>
            </tr></thead>
            <tbody>${list.map(p => `
                <tr>
                    <td><img src="${esc(p.logo_url)}" style="height:40px;object-fit:contain" onerror="this.style.display='none'"></td>
                    <td><strong>${esc(p.name)}</strong></td>
                    <td>${p.website_url ? `<a href="${esc(p.website_url)}" target="_blank" rel="noopener">${esc(p.website_url)}</a>` : '—'}</td>
                    <td>${p.display_order}</td>
                    <td>${p.is_active ? '<span class="badge badge-approved">نشط</span>' : '<span class="badge badge-cancelled">معطل</span>'}</td>
                    <td style="display:flex;gap:0.4rem">
                        <button class="btn btn-sm btn-outline" onclick="editPartner('${p.id}')"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-sm btn-danger" onclick="deletePartner('${p.id}')"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>`).join('')}
            </tbody>
        </table>`;
}

function openPartnerModal() {
    editingPartnerId = null;
    document.getElementById('partnerModalTitle').textContent = 'إضافة شريك جديد';
    document.getElementById('partnerForm').reset();
    document.getElementById('partnerModal').classList.add('active');
}

function closePartnerModal() {
    document.getElementById('partnerModal').classList.remove('active');
    editingPartnerId = null;
}

function editPartner(id) {
    const p = allPartners.find(x => x.id === id);
    if (!p) return;
    editingPartnerId = id;
    document.getElementById('partnerModalTitle').textContent = 'تعديل الشريك';
    document.getElementById('partnerName').value = p.name || '';
    document.getElementById('partnerLogo').value = p.logo_url || '';
    document.getElementById('partnerWebsite').value = p.website_url || '';
    document.getElementById('partnerOrder').value = p.display_order || 0;
    document.getElementById('partnerModal').classList.add('active');
}

async function savePartner(e) {
    e.preventDefault();
    const payload = {
        name: document.getElementById('partnerName').value.trim(),
        logo_url: document.getElementById('partnerLogo').value.trim(),
        website_url: document.getElementById('partnerWebsite').value.trim(),
        display_order: parseInt(document.getElementById('partnerOrder').value) || 0
    };

    let error;
    if (editingPartnerId) {
        ({ error } = await supabase.from('partners').update(payload).eq('id', editingPartnerId));
    } else {
        ({ error } = await supabase.from('partners').insert(payload));
    }

    if (error) { alert('خطأ: ' + error.message); return; }
    closePartnerModal();
    loadPartners();
}

async function deletePartner(id) {
    if (!confirm('حذف هذا الشريك؟')) return;
    const { error } = await supabase.from('partners').delete().eq('id', id);
    if (error) alert('خطأ: ' + error.message);
    else loadPartners();
}

// =============================================
// Helpers
// =============================================
function esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
}

function audienceBadge(type) {
    const map = { employee: ['badge-employee','موظف'], seeker: ['badge-seeker','باحث عن عمل'], both: ['badge-both','الجميع'] };
    const [cls, label] = map[type] || ['badge-both','الجميع'];
    return `<span class="badge ${cls}">${label}</span>`;
}

function statusBadge(s) {
    const map = { pending: 'معلق', approved: 'مقبول', completed: 'مكتمل', cancelled: 'ملغي' };
    return `<span class="badge badge-${s}">${map[s] || s}</span>`;
}

function contactBadge(s) {
    const map = { new: 'جديد', read: 'مقروء', replied: 'تم الرد' };
    return `<span class="badge badge-${s}">${map[s] || s}</span>`;
}

function emptyState(msg) {
    return `<div class="empty-state"><i class="fas fa-inbox"></i><p>${msg}</p></div>`;
}

function renderError(containerId, msg) {
    document.getElementById(containerId).innerHTML =
        `<div class="alert alert-danger" style="margin:1rem"><i class="fas fa-exclamation-circle"></i> خطأ: ${esc(msg)}</div>`;
}
