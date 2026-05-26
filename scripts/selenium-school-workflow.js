#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const assert = require('node:assert/strict');
const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

const BASE_URL = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const TIMEOUT_MS = Number(process.env.SELENIUM_TIMEOUT_MS || 120000);
const POLL_INTERVAL_MS = Number(process.env.SELENIUM_POLL_INTERVAL_MS || 1200);
const HEADLESS = process.env.HEADLESS !== 'false';

const runId = Date.now().toString(36);
const schoolName = `Selenium Academy ${runId}`;
const principalFirstName = 'Sel';
const principalLastName = `Principal${runId.slice(-4)}`;
const principalEmail = `principal.${runId}@example.test`;
const schoolRegistrationPrincipalEmail = `principal-contact.${runId}@example.test`;
const principalPassword = process.env.PRINCIPAL_PASSWORD || 'Passw0rd!123';

const teacherFirstName = 'Sel';
const teacherLastName = `Teacher${runId.slice(-4)}`;
const teacherEmail = `teacher.${runId}@example.test`;
const teacherPassword = process.env.TEACHER_PASSWORD || 'Passw0rd!123';

const studentFirstName = 'Sel';
const studentLastName = `Student${runId.slice(-4)}`;
const studentEmail = `student.${runId}@example.test`;
const studentPassword = process.env.STUDENT_PASSWORD || 'Passw0rd!123';

const gradeName = `Grade 10 ${runId.slice(-4)}`;
const gradeLevel = Number(process.env.GRADE_LEVEL || 10);
const subjectName = `Mathematics ${runId.slice(-4)}`;
const subjectCode = `M${runId.slice(-6).toUpperCase()}`;
const syllabusTitle = `Selenium Syllabus ${runId}`;
const topicTitle = process.env.TOPIC_TITLE || `Linear Equations ${runId.slice(-4)}`;

function log(message) {
  console.log(`[workflow] ${message}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function endpoint(path) {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  return `${BASE_URL}${path}`;
}

async function waitForVisible(driver, locator, timeout = TIMEOUT_MS) {
  const element = await driver.wait(until.elementLocated(locator), timeout);
  await driver.wait(until.elementIsVisible(element), timeout);
  return element;
}

async function typeInto(driver, locator, value) {
  const element = await waitForVisible(driver, locator);
  await element.clear();
  await element.sendKeys(value);
}

async function click(driver, locator) {
  const element = await waitForVisible(driver, locator);
  await driver.wait(until.elementIsEnabled(element), TIMEOUT_MS);
  await element.click();
}

async function getBodyText(driver) {
  const body = await waitForVisible(driver, By.css('body'));
  return body.getText();
}

async function waitForBodyText(driver, text, timeout = TIMEOUT_MS) {
  await driver.wait(async () => {
    const bodyText = await getBodyText(driver);
    return bodyText.includes(text);
  }, timeout);
}

async function apiFetchRaw(driver, path, options = {}) {
  const method = options.method || 'GET';
  const body = options.body === undefined ? null : options.body;
  const headers = options.headers || {};
  const url = endpoint(path);

  return driver.executeAsyncScript(
    `
      const [url, method, body, headers, done] = arguments;
      const requestHeaders = Object.assign({}, headers);
      if (body !== null && requestHeaders['Content-Type'] == null) {
        requestHeaders['Content-Type'] = 'application/json';
      }

      fetch(url, {
        method,
        credentials: 'include',
        headers: requestHeaders,
        body: body === null ? undefined : JSON.stringify(body),
      })
        .then(async (response) => {
          const text = await response.text();
          let data = text;
          try {
            data = text ? JSON.parse(text) : null;
          } catch {
            // keep text response
          }
          done({ ok: response.ok, status: response.status, data });
        })
        .catch((error) => {
          done({ ok: false, status: 0, error: String(error) });
        });
    `,
    url,
    method,
    body,
    headers
  );
}

async function apiFetch(driver, path, options = {}) {
  const result = await apiFetchRaw(driver, path, options);
  if (!result.ok) {
    throw new Error(
      `API ${options.method || 'GET'} ${path} failed with ${result.status}: ${JSON.stringify(
        result.data || result.error
      )}`
    );
  }
  return result.data;
}

async function waitForAuthRole(driver, role, timeout = TIMEOUT_MS) {
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    const me = await apiFetchRaw(driver, '/api/auth/me');
    if (me.ok && me.data?.user?.role === role) {
      return me.data.user;
    }
    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(`Timed out waiting for authenticated role: ${role}`);
}

async function clearSession(driver) {
  await driver.get(BASE_URL);
  await apiFetchRaw(driver, '/api/auth/logout', { method: 'POST' });
  await driver.manage().deleteAllCookies();
  await driver.executeScript(`
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    sessionStorage.clear();
  `);
}

async function login(driver, email, password, role) {
  await driver.get(BASE_URL);
  await apiFetch(driver, '/api/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  return waitForAuthRole(driver, role);
}

async function registerSchool(driver) {
  log('Registering a new school through the UI');
  await driver.get(endpoint('/register-school'));

  await typeInto(driver, By.css('input[name="schoolName"]'), schoolName);
  await typeInto(driver, By.css('input[name="country"]'), 'United States');
  await typeInto(driver, By.css('input[name="state"]'), 'New York');
  await typeInto(driver, By.css('input[name="city"]'), 'New York City');

  const schoolType = await waitForVisible(driver, By.css('select[name="schoolType"]'));
  await schoolType.sendKeys('High School');

  const studentCount = await waitForVisible(driver, By.css('select[name="studentCount"]'));
  await studentCount.sendKeys('100 - 500');

  await click(driver, By.xpath("//button[contains(normalize-space(), 'Next: Principal Information')]"));

  await typeInto(driver, By.css('input[name="principalFirstName"]'), principalFirstName);
  await typeInto(driver, By.css('input[name="principalLastName"]'), principalLastName);
  await typeInto(driver, By.css('input[name="principalEmail"]'), schoolRegistrationPrincipalEmail);
  await typeInto(driver, By.css('input[name="phone"]'), '+1 555-0101');
  await typeInto(driver, By.css('input[name="website"]'), 'https://selenium-school.example.test');

  await click(driver, By.xpath("//button[contains(normalize-space(), 'Next: Review')]"));
  await click(driver, By.xpath("//button[contains(normalize-space(), 'Submit Registration')]"));

  await waitForBodyText(driver, 'Application Submitted!');

  const text = await getBodyText(driver);
  const schoolCodeMatch = text.match(/School Invite Code:\s*(SCH-[A-Z0-9_-]{8})/i);
  if (!schoolCodeMatch) {
    throw new Error(`School invite code was not found. Page snapshot: ${text.slice(0, 600)}`);
  }

  const schoolDomainMatch = text.match(/School Domain:\s*([a-z0-9.-]+)/i);
  const schoolCode = schoolCodeMatch[1].toUpperCase();
  const schoolDomain = schoolDomainMatch?.[1]?.toLowerCase() || null;
  log(`School registered. Invite code: ${schoolCode}${schoolDomain ? `, domain: ${schoolDomain}` : ''}`);
  return { schoolCode, schoolDomain };
}

async function signupPrincipal(driver, schoolCredential) {
  log('Creating principal account');
  await driver.get(BASE_URL);
  await apiFetch(driver, '/api/auth/signup', {
    method: 'POST',
    body: {
      firstName: principalFirstName,
      lastName: principalLastName,
      email: principalEmail,
      password: principalPassword,
      role: 'principal',
      schoolCode: schoolCredential,
    },
  });

  const principalUser = await waitForAuthRole(driver, 'principal');
  log(`Principal authenticated. userId=${principalUser.id}`);
  return principalUser;
}

async function createTeacher(driver) {
  log('Creating teacher account via principal API');
  const created = await apiFetch(driver, '/api/principal/staff', {
    method: 'POST',
    body: {
      firstName: teacherFirstName,
      lastName: teacherLastName,
      email: teacherEmail,
      password: teacherPassword,
      role: 'teacher',
    },
  });

  if (!created?.success || !created?.data?.id) {
    throw new Error(`Unexpected teacher creation response: ${JSON.stringify(created)}`);
  }

  log(`Teacher created. userId=${created.data.id}`);
  return created.data;
}

async function createGradeAndSubject(driver) {
  log('Creating grade and subject via principal API');

  const gradeResult = await apiFetch(driver, '/api/syllabi/grades', {
    method: 'POST',
    body: {
      name: gradeName,
      level: gradeLevel,
    },
  });

  const subjectResult = await apiFetch(driver, '/api/syllabi/subjects', {
    method: 'POST',
    body: {
      name: subjectName,
      code: subjectCode,
    },
  });

  const gradeId = gradeResult?.data?.id;
  const subjectId = subjectResult?.data?.id;

  if (!gradeId || !subjectId) {
    throw new Error(
      `Failed to capture grade/subject IDs: ${JSON.stringify({ gradeResult, subjectResult })}`
    );
  }

  log(`Grade and subject ready. gradeId=${gradeId}, subjectId=${subjectId}`);
  return { gradeId, subjectId };
}

async function createSyllabusAndTopic(driver, gradeId, subjectId) {
  log('Creating syllabus and adding topic via teacher API');

  const createSyllabusResponse = await apiFetch(driver, '/api/syllabus', {
    method: 'POST',
    body: {
      gradeId,
      subjectId,
      title: syllabusTitle,
    },
  });

  let syllabusId = createSyllabusResponse?.data?.id;
  if (!syllabusId) {
    const syllabusLookup = await apiFetch(
      driver,
      `/api/syllabus/grade/${encodeURIComponent(gradeId)}/subject/${encodeURIComponent(subjectId)}`
    );
    syllabusId = syllabusLookup?.data?.id;
  }

  assert.ok(syllabusId, 'Syllabus ID is missing from create/lookup response');

  await apiFetch(driver, `/api/syllabus/${encodeURIComponent(syllabusId)}/topics`, {
    method: 'POST',
    body: {
      title: topicTitle,
      description: `Topic coverage for ${topicTitle}`,
      orderIndex: 1,
    },
  });

  const topicsResponse = await apiFetch(
    driver,
    `/api/syllabus/${encodeURIComponent(syllabusId)}/topics`
  );
  const topics = Array.isArray(topicsResponse?.data) ? topicsResponse.data : [];
  const topic = topics.find((item) => item.title === topicTitle) || topics[0];

  if (!topic?.id) {
    throw new Error(`Topic not found after creation: ${JSON.stringify(topicsResponse)}`);
  }

  log(`Syllabus/topic created. syllabusId=${syllabusId}, topicId=${topic.id}`);
  return { syllabusId, topicId: topic.id };
}

async function signupStudent(driver) {
  log('Creating student account');
  await driver.get(endpoint('/auth/signup/student'));

  await typeInto(driver, By.css('input[name="firstName"]'), studentFirstName);
  await typeInto(driver, By.css('input[name="lastName"]'), studentLastName);
  await typeInto(driver, By.css('input[name="email"]'), studentEmail);
  await typeInto(driver, By.css('input[name="password"]'), studentPassword);
  await typeInto(driver, By.css('input[name="confirmPassword"]'), studentPassword);

  await click(driver, By.xpath("//button[contains(normalize-space(), 'Create Account')]"));

  const studentUser = await waitForAuthRole(driver, 'student');
  log(`Student authenticated. userId=${studentUser.id}`);
  return studentUser;
}

async function studentJoinSchool(driver, schoolId) {
  log('Student requests enrollment into school');
  const response = await apiFetch(driver, `/api/student/schools/${encodeURIComponent(schoolId)}/join`, {
    method: 'POST',
    body: {},
  });

  if (!response?.success) {
    throw new Error(`Student join request failed: ${JSON.stringify(response)}`);
  }

  return response;
}

async function approveStudentEnrollment(driver, schoolId, studentId) {
  log('Approving student enrollment as principal');

  const requestsResponse = await apiFetch(
    driver,
    `/api/principal/schools/${encodeURIComponent(schoolId)}/join-requests`
  );
  const requests = Array.isArray(requestsResponse?.data) ? requestsResponse.data : [];

  const request =
    requests.find((item) => item.studentId === studentId || item.student_id === studentId) ||
    requests[0];

  if (!request?.id) {
    throw new Error(`No pending join requests found: ${JSON.stringify(requestsResponse)}`);
  }

  const approveResponse = await apiFetch(
    driver,
    `/api/principal/join-requests/${encodeURIComponent(request.id)}/approve`,
    { method: 'POST', body: {} }
  );

  if (!approveResponse?.success) {
    throw new Error(`Failed to approve join request: ${JSON.stringify(approveResponse)}`);
  }

  return approveResponse;
}

async function waitForApprovedMembership(driver, schoolId, timeout = TIMEOUT_MS) {
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    const memberships = await apiFetch(driver, '/api/student/schools');
    const list = Array.isArray(memberships?.data) ? memberships.data : [];

    const approved = list.some(
      (m) => m.schoolId === schoolId && String(m.status || '').toLowerCase() === 'approved'
    );

    if (approved) {
      return true;
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error('Timed out waiting for approved student membership');
}

function buildSimpleInteractiveScene(classroomId, sceneTitle) {
  const html = `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${sceneTitle}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 0; padding: 32px; }
      h1 { margin: 0 0 12px; }
      p { margin: 0; color: #334155; }
    </style>
  </head>
  <body>
    <h1>${sceneTitle}</h1>
    <p>This classroom scene was created by Selenium workflow automation.</p>
  </body>
</html>`;

  return {
    id: `scene-${runId}`,
    stageId: classroomId,
    type: 'interactive',
    title: sceneTitle,
    order: 1,
    content: {
      type: 'interactive',
      url: 'about:blank',
      html,
    },
    actions: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

async function createClassroomForTopic(driver, sceneTitle) {
  log('Creating classroom and binding it to the syllabus topic title');

  const classroomId = `class-${runId}`;
  const stage = {
    id: classroomId,
    name: `${sceneTitle} Classroom`,
    description: 'Automated workflow classroom',
    language: 'en-US',
    style: 'interactive',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const scene = buildSimpleInteractiveScene(classroomId, sceneTitle);

  const response = await apiFetch(driver, '/api/classroom', {
    method: 'POST',
    body: {
      stage,
      scenes: [scene],
    },
  });

  const url = response?.url || `${BASE_URL}/classroom/${classroomId}`;
  const id = response?.id || classroomId;

  log(`Classroom created. classroomId=${id}`);
  return { id, url };
}

async function openClassroomAndVerifyTopic(driver, classroomUrl, sceneTitle) {
  log('Opening classroom as student and verifying topic is visible');
  await driver.get(classroomUrl);

  await driver.wait(async () => {
    const text = await getBodyText(driver);
    return text.includes(sceneTitle);
  }, TIMEOUT_MS);

  log(`Topic is visible in classroom: "${sceneTitle}"`);
}

async function main() {
  let driver;

  try {
    const options = new chrome.Options();
    options.addArguments('--window-size=1440,1000', '--no-sandbox', '--disable-dev-shm-usage');

    if (HEADLESS) {
      options.addArguments('--headless=new');
    }

    if (process.env.CHROME_BINARY) {
      options.setChromeBinaryPath(process.env.CHROME_BINARY);
    }

    driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
    await driver.manage().setTimeouts({
      implicit: 0,
      pageLoad: TIMEOUT_MS,
      script: TIMEOUT_MS,
    });

    log(`Run ID: ${runId}`);
    log(`Base URL: ${BASE_URL}`);

    const schoolRegistration = await registerSchool(driver);
    const schoolCredential = schoolRegistration.schoolDomain || schoolRegistration.schoolCode;
    const principalUser = await signupPrincipal(driver, schoolCredential);

    const me = await apiFetch(driver, '/api/auth/me');
    const schoolId = me?.user?.schoolId;
    assert.ok(schoolId, 'Principal schoolId is missing');

    await createTeacher(driver);
    const { gradeId, subjectId } = await createGradeAndSubject(driver);

    await clearSession(driver);
    await login(driver, teacherEmail, teacherPassword, 'teacher');
    await createSyllabusAndTopic(driver, gradeId, subjectId);

    await clearSession(driver);
    const studentUser = await signupStudent(driver);
    await studentJoinSchool(driver, schoolId);

    await clearSession(driver);
    await login(driver, principalEmail, principalPassword, 'principal');
    await approveStudentEnrollment(driver, schoolId, studentUser.id);

    await clearSession(driver);
    await login(driver, studentEmail, studentPassword, 'student');
    await waitForApprovedMembership(driver, schoolId);

    const classroom = await createClassroomForTopic(driver, topicTitle);
    await openClassroomAndVerifyTopic(driver, classroom.url, topicTitle);

    log('Workflow completed successfully.');
    log(
      `Summary: ${JSON.stringify(
        {
          schoolId,
          schoolCode: schoolRegistration.schoolCode,
          schoolDomain: schoolRegistration.schoolDomain,
          principalUserId: principalUser.id,
          teacherEmail,
          studentUserId: studentUser.id,
          gradeId,
          subjectId,
          topicTitle,
          classroomId: classroom.id,
          classroomUrl: classroom.url,
        },
        null,
        2
      )}`
    );
  } catch (error) {
    console.error('[workflow] Failed:', error);
    process.exitCode = 1;
  } finally {
    if (driver) {
      await driver.quit();
    }
  }
}

main();
