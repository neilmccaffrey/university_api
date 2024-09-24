const express = require('express');
const app = express();
const { Pool } = require('pg');

app.use(express.json());

const pool = new Pool({
  user: 'Neil M',
  host: 'localhost',
  database: 'university_db',
  password: 'secret_password',
  port: 5432,
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});

//Provide a list of all courses and the professor teaching each course.
app.get('/courses', async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT c.course_name, p.name AS professor_name
        FROM courses c
        JOIN professors p ON c.professor_id = p.professor_id
      `);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  //Allow students to enroll in a course.
  app.post('/enroll', async (req, res) => {
    const { student_id, course_id } = req.body;
    try {
      // Enroll student in the course
      // returns unique enrollment_id (serial primary key)
      const result = await pool.query(`
        INSERT INTO enrollments (student_id, course_id) 
        VALUES ($1, $2) 
        RETURNING enrollment_id 
      `, [student_id, course_id]);
        
      res.json({ message: 'Student enrolled successfully', enrollment_id: result.rows[0].enrollment_id });
    } catch (err) {
        res.status(500).json({ error: err.message });
      }
  });

  // Allow professors to assign grades to students in the courses they are teaching.
  app.post('/assign-grade', async (req, res) => {
    const { enrollment_id, grade, professor_id } = req.body;

    // Validate that the grade is within the allowed range
    if (grade < 0 || grade > 100) {
        return res.status(400).json({ error: 'Grade must be between 0 and 100' });
     }

    try {
      // Check if the professor teaches the course for the enrollment
      const checkProfessor = await pool.query(`
        SELECT c.course_id
        FROM enrollments e
        JOIN courses c ON e.course_id = c.course_id
        WHERE e.enrollment_id = $1 AND c.professor_id = $2
      `, [enrollment_id, professor_id]);
  
      if (checkProfessor.rowCount === 0) {
        return res.status(403).json({ error: 'Professor not authorized to assign grade for this course' });
      }
  
      // Assign the grade if professor is authorized
      await pool.query(`
        INSERT INTO grades (enrollment_id, grade) 
        VALUES ($1, $2)
      `, [enrollment_id, grade]);
  
      res.json({ message: 'Grade assigned successfully' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  //Provide a report showing the average grade for each course
  app.get('/average-grades', async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT c.course_name, AVG(g.grade) AS average_grade
        FROM courses c
        JOIN enrollments e ON c.course_id = e.course_id
        JOIN grades g ON e.enrollment_id = g.enrollment_id
        GROUP BY c.course_name
      `);
  
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });