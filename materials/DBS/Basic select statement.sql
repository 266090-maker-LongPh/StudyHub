##SELECT
use themepark;
select * from employee;
select emp_num,emp_title, emp_lname, emp_fname
from employee;
##ALIAS
select emp_num as "Số thứ tự", emp_lname as "Last name",
emp_fname as "First name" from employee;
##  order by 
select * from employee order by emp_fname desc;
select * from employee order by emp_fname asc;
select * from employee order by emp_fname;
select * from employee 
order by emp_area_code, emp_fname desc;
## Condition ( select + where + (<,>,= , !=, <>)
select * from employee where emp_fname = "arif";
select * from employee where emp_num >= 104;
#AND/ OR
select * from employee where emp_fname = "arif" 
and  emp_num = 102;
select * from employee where emp_fname = "arif" 
or  emp_num = 103;
## Condition ( select + where + like + wildcard(%,_)
select * from employee where emp_fname like "%n_";
## Select + operators (+, -, *, /)
select * from sales_line;
select ticket_no, line_qty, line_price,
line_qty * (line_price -10) as Total 
from sales_line 
where line_qty >1 
order by line_price
;

#a. List all students whoes names start with a
use ems;
select * from student where studentname like "a%";
#b.	List all courses whoes ids end with 12
select * from course  where courseid like "%12";
#c.	Find the faculty whoes name is Collins
select * from faculty where facultyname like "Collins";
#d.	Find all sections with section number from 2713 to 2717 
select * from section where sectionno between 2713 and 2717;
select * from section where sectionno >= 2713 and sectionno <= 2717;
#e.	Find all students who register courses in the first semester of 2008
select * from registration where semester = "I-2008";
#f.	List facultyid of all faculty who teach course ISM 3113
select * from qualified where courseid = "ISM 3113";

#return all data from hours table.   
#display all data from themepark in ascending order of city,
# then ascending order of park_code give each column a full name.
# display all attraction
#display employee number, hours_per_attract, hour_rate, 
# and total day payment where:total day payment = hours_per_attract * hour_rate 
#display all attractions whoes age > 40 and capacity is > 100;

#display the result with employee number in reverse order
