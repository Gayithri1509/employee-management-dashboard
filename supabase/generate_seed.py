import random
import itertools

random.seed(42)  # fixed seed -> this script always produces the same output

DEPARTMENTS = [
    "Engineering", "Design", "Product", "Marketing",
    "Sales", "Human Resources", "Finance", "Customer Support",
]

# Original 12 — preserved exactly from src/data/employees.ts
ORIGINAL = [
    dict(name="Ananya Rao", role="Frontend Engineer", department="Engineering",
         email="ananya.rao@examplecorp.com", phone="+1 555-0101", location="Bengaluru",
         status="Active", joining_date="2022-03-14"),
    dict(name="Marcus Chen", role="Backend Engineer", department="Engineering",
         email="marcus.chen@examplecorp.com", phone="+1 555-0102", location="Seattle",
         status="Active", joining_date="2021-07-01"),
    dict(name="Priya Nair", role="Engineering Manager", department="Engineering",
         email="priya.nair@examplecorp.com", phone="+1 555-0103", location="Bengaluru",
         status="Active", joining_date="2019-11-20"),
    dict(name="Diego Fernandez", role="Product Designer", department="Design",
         email="diego.fernandez@examplecorp.com", phone="+1 555-0104", location="Austin",
         status="Active", joining_date="2023-01-09"),
    dict(name="Sara Kim", role="UX Researcher", department="Design",
         email="sara.kim@examplecorp.com", phone="+1 555-0105", location="Remote",
         status="On Leave", joining_date="2022-08-15"),
    dict(name="Michael Osei", role="Product Manager", department="Product",
         email="michael.osei@examplecorp.com", phone="+1 555-0106", location="New York",
         status="Active", joining_date="2020-05-04"),
    dict(name="Elena Petrova", role="Marketing Specialist", department="Marketing",
         email="elena.petrova@examplecorp.com", phone="+1 555-0107", location="London",
         status="Active", joining_date="2023-06-19"),
    dict(name="James Whitfield", role="Sales Executive", department="Sales",
         email="james.whitfield@examplecorp.com", phone="+1 555-0108", location="Chicago",
         status="Inactive", joining_date="2018-02-27"),
    dict(name="Fatima Al-Sayed", role="HR Business Partner", department="Human Resources",
         email="fatima.alsayed@examplecorp.com", phone="+1 555-0109", location="Dubai",
         status="Active", joining_date="2021-09-30"),
    dict(name="Tom Becker", role="Financial Analyst", department="Finance",
         email="tom.becker@examplecorp.com", phone="+1 555-0110", location="Berlin",
         status="Active", joining_date="2022-12-01"),
    dict(name="Grace Lin", role="Customer Support Lead", department="Customer Support",
         email="grace.lin@examplecorp.com", phone="+1 555-0111", location="Toronto",
         status="Active", joining_date="2020-10-13"),
    dict(name="Ryan O'Connor", role="Sales Associate", department="Sales",
         email="ryan.oconnor@examplecorp.com", phone="+1 555-0112", location="Chicago",
         status="Inactive", joining_date="2019-04-22"),
]

ORIGINAL_NAMES = {e["name"] for e in ORIGINAL}

# How many additional employees each department needs to reach 15 (120 total)
TARGET_PER_DEPT = 15
existing_counts = {d: 0 for d in DEPARTMENTS}
for e in ORIGINAL:
    existing_counts[e["department"]] += 1
ADDITIONAL_PER_DEPT = {d: TARGET_PER_DEPT - existing_counts[d] for d in DEPARTMENTS}
assert sum(ADDITIONAL_PER_DEPT.values()) == 108, ADDITIONAL_PER_DEPT

TITLES = {
    "Engineering": ["Software Engineer", "Senior Software Engineer", "QA Engineer",
                    "DevOps Engineer", "Staff Engineer", "Mobile Engineer"],
    "Design": ["UI Designer", "Product Designer", "Design Lead", "Visual Designer"],
    "Product": ["Product Analyst", "Senior Product Manager", "Associate Product Manager", "Product Ops Lead"],
    "Marketing": ["Content Strategist", "Marketing Manager", "SEO Analyst", "Brand Manager"],
    "Sales": ["Account Executive", "Sales Manager", "Business Development Rep", "Sales Ops Analyst"],
    "Human Resources": ["HR Generalist", "Recruiter", "HR Manager", "People Ops Specialist"],
    "Finance": ["Accountant", "Finance Manager", "Payroll Specialist", "Revenue Analyst"],
    "Customer Support": ["Support Specialist", "Customer Success Manager", "Technical Support Engineer", "Support Ops Analyst"],
}

FIRST_NAMES = [
    "Wei", "Noah", "Liam", "Mateo", "Yuki", "Ines", "Omar", "Chidi", "Lucas", "Hana",
    "Aditi", "Sven", "Zainab", "Ivo", "Nadia", "Theo", "Amara", "Kenji", "Freya", "Rafael",
    "Mira", "Bashir", "Elif", "Anders", "Layla", "Dmitri", "Sofia", "Kwame", "Naomi", "Pavel",
    "Chloe", "Arjun", "Greta", "Youssef", "Isla", "Hiro", "Camille", "Tariq", "Anya", "Diego",
    "Mei", "Oscar", "Farah", "Bjorn", "Rosa", "Kofi", "Ingrid", "Nasrin", "Alessio", "Priyanka",
    "Emeka", "Sakura", "Malik", "Vera", "Amos", "Leila", "Otto", "Sana", "Kiran", "Elsa",
]

LAST_NAMES = [
    "Zhang", "Kowalski", "Okafor", "Silva", "Nakamura", "Haddad", "Larsen", "Reyes", "Kim",
    "Novak", "Abara", "Petrov", "Fischer", "Adeyemi", "Costa", "Sato", "Muller", "Rahman",
    "Ferreira", "Andersen", "Diallo", "Bianchi", "Volkov", "Mensah", "Suzuki", "Herrera",
    "Nystrom", "Barros", "Nasser", "Bergstrom", "Iyer", "Kowal", "Osman", "Castillo", "Tanaka",
    "Weiss", "Adebayo", "Moreno", "Lindqvist", "Farah", "Duarte", "Halvorsen", "Ochoa",
    "Yamamoto", "Karim", "Berg", "Njoroge", "Salas", "Ekberg", "Rocha", "Hussain", "Solberg",
    "Amara", "Wangui", "Mattson", "Delgado", "Nwosu", "Lindberg", "Cardoso", "Farrell",
]

LOCATIONS = [
    "Bengaluru", "Seattle", "Austin", "Remote", "New York", "London", "Chicago", "Dubai",
    "Berlin", "Toronto", "Singapore", "Sydney", "Dublin", "Amsterdam", "Tokyo", "Mumbai",
    "San Francisco", "Boston", "Denver", "Vancouver", "Paris", "Cape Town", "Madrid", "Warsaw",
]

def slug_email(name: str) -> str:
    parts = "".join(c for c in name.lower() if c.isalpha() or c in " '-").split(" ")
    parts = ["".join(c for c in p if c.isalpha()) for p in parts if p]
    return ".".join(parts) + "@examplecorp.com"

# Deterministic unique name pairs, avoiding collisions with the original 12
used_names = set(ORIGINAL_NAMES)
used_emails = {e["email"] for e in ORIGINAL}

# Build the full first x last cross product (3600 pairs) and shuffle it
# deterministically (fixed seed) before drawing 108 unique names from it.
# A plain divmod walk (first_idx = i % 60, last_idx = i // 60) technically
# gives unique pairs too, but produces long unrealistic runs (e.g. 60
# consecutive "<First> Zhang" employees before the last name changes) —
# shuffling the full cross product first spreads combinations out so the
# 108 generated employees actually read as distinct people.
all_pairs = list(itertools.product(FIRST_NAMES, LAST_NAMES))
random.shuffle(all_pairs)

name_pool = []
for first, last in all_pairs:
    if len(name_pool) >= 108:
        break
    full = f"{first} {last}"
    if full in used_names:
        continue
    used_names.add(full)
    name_pool.append((first, last, full))

assert len(name_pool) == 108

# Status mix across the 108 additional employees: 87 Active, 10 Inactive, 11 On Leave
statuses = ["Active"] * 87 + ["Inactive"] * 10 + ["On Leave"] * 11
random.shuffle(statuses)
assert len(statuses) == 108

# Build department assignment list matching ADDITIONAL_PER_DEPT
dept_assignments = []
for d in DEPARTMENTS:
    dept_assignments += [d] * ADDITIONAL_PER_DEPT[d]
assert len(dept_assignments) == 108
random.shuffle(dept_assignments)

phone_counter = 113  # continues from 0112 used by the original 12

def joining_date_for(i: int) -> str:
    # Deterministic spread of joining dates between 2015-01-05 and 2026-06-01
    import datetime
    start = datetime.date(2015, 1, 5)
    end = datetime.date(2026, 6, 1)
    span_days = (end - start).days
    offset = (i * 37 + 11) % span_days
    return str(start + datetime.timedelta(days=offset))

additional = []
title_cursors = {d: 0 for d in DEPARTMENTS}
for i in range(108):
    first, last, full = name_pool[i]
    dept = dept_assignments[i]
    titles = TITLES[dept]
    title = titles[title_cursors[dept] % len(titles)]
    title_cursors[dept] += 1
    email = slug_email(full)
    if email in used_emails:
        email = slug_email(full).replace("@", f"{i}@")
    used_emails.add(email)
    location = LOCATIONS[(i * 5 + 2) % len(LOCATIONS)]
    phone = f"+1 555-{phone_counter:04d}"
    phone_counter += 1
    additional.append(dict(
        name=full, role=title, department=dept, email=email, phone=phone,
        location=location, status=statuses[i], joining_date=joining_date_for(i),
    ))

assert len(additional) == 108
assert len({e["email"] for e in additional}) == 108
assert len({e["name"] for e in additional}) == 108

ALL = ORIGINAL + additional
assert len(ALL) == 120

def sql_escape(s: str) -> str:
    return s.replace("'", "''")

lines = []
lines.append("-- ============================================================================")
lines.append("-- 0010_seed_employees.sql")
lines.append("-- Seeds exactly 120 fictional employees: the original 12 from")
lines.append("-- src/data/employees.ts, preserved exactly, plus 108 additional synthetic")
lines.append("-- records generated deterministically (fixed random seed) by")
lines.append("-- generate_seed.py, documented in docs/database-architecture.md.")
lines.append("--")
lines.append("-- profile_id / created_by / updated_by are left null throughout: there is")
lines.append("-- no authenticated actor during seeding.")
lines.append("--")
lines.append("-- These 120 rows are synthetic bootstrap data, not real HR actions, so the")
lines.append("-- employees_audit_insert trigger (0007) is disabled for the duration of this")
lines.append("-- migration only and re-enabled immediately afterward, in the same")
lines.append("-- transaction. The UPDATE and DELETE audit triggers are never touched, are")
lines.append("-- never disabled, and remain fully active throughout — including during")
lines.append("-- this migration. Only the one-time bootstrap INSERT event is skipped;")
lines.append("-- every future employee insert/update/delete through the running")
lines.append("-- application is audited exactly as before, with no change to the trigger")
lines.append("-- function or its logic.")
lines.append("-- ============================================================================")
lines.append("")
lines.append("begin;")
lines.append("")
lines.append("alter table employees disable trigger employees_audit_insert;")
lines.append("")
lines.append("insert into employees (name, role, department_id, email, phone, location, status, joining_date, profile_id, created_by, updated_by)")
lines.append("values")

value_lines = []
for e in ALL:
    value_lines.append(
        "  ('%s', '%s', (select id from departments where name = '%s'), '%s', '%s', '%s', '%s', '%s', null, null, null)"
        % (
            sql_escape(e["name"]), sql_escape(e["role"]), sql_escape(e["department"]),
            sql_escape(e["email"]), sql_escape(e["phone"]), sql_escape(e["location"]),
            e["status"], e["joining_date"],
        )
    )
lines.append(",\n".join(value_lines))
lines.append("on conflict (email) do nothing;")
lines.append("")
lines.append("alter table employees enable trigger employees_audit_insert;")
lines.append("")
lines.append("commit;")

with open("0010_seed_employees.sql", "w") as f:
    f.write("\n".join(lines) + "\n")

# Print a summary for verification
from collections import Counter
dept_counts = Counter(e["department"] for e in ALL)
status_counts = Counter(e["status"] for e in ALL)
print("Department counts:", dict(dept_counts))
print("Status counts:", dict(status_counts))
print("Total:", len(ALL))
print("Unique emails:", len({e["email"] for e in ALL}))
print("Unique names:", len({e["name"] for e in ALL}))
