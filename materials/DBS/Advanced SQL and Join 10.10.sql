#ADVANCED: Aggregate , group by, having, join, 
# Functions(date time, string, math)
## COUNT
select * from attraction;
select * from themepark;
select count(*) from attraction;
## SUM 
select sum(attract_capacity) from attraction;
## AVG 
select avg(attract_capacity) from attraction;
## MIN, MAX
select min(attract_capacity) as "Min capacity", 
max(attract_Capacity) as "Max capacity"
from attraction;
## GROUP BY
use themepark;
select park_code, count(*) as "Total attractions"
from attraction 
group by park_code;
#Min and Max capacity for each themepark
select park_code, min(attract_capacity) as Min,
max(attract_Capacity) as Max
from attraction 
group by park_code;
#HAVING
select park_code, count(*) as "Total attractions"
from attraction 
group by park_code
having count(*) > 3;
# find the themepark that contain more than 3
# attractions in the UK
select park_code, count(*) as "Total attractions"
from attraction 
where park_code like "UK%" 
group by park_code
having count(*) > 3
order by park_code desc;

#INNER JOIN
### 1st
select * from attraction, themepark 
where attraction.park_code = themepark.park_code;
## 2nd
select * from attraction inner join themepark
on attraction.park_code = themepark.park_code;
## 3rd
select * from attraction natural join themepark;
#LEFT JOIN/ RIGHT JOIN
use themepark;
select * from themepark left join  attraction
on attraction.park_code = themepark.park_code;
select * from attraction right join themepark
on attraction.park_code = themepark.park_code;
# cross join
select * from attraction cross join themepark;
## example
###1
select studentname, dob, classname, formteacher
from student 
inner join class on student.classid = class.classid;
### 2
select studentname, dob, classname, formteacher
from student,class where student.classid = class.classid;
### 3
select studentname, dob, classname, formteacher
from student natural join class ;
### multi join
select ticket_no, line_qty, line_price, sale_date,
park_name, park_city 
from sales_line inner join sales 
on sales_line.transaction_no = sales.transaction_no
inner join themepark 
on sales.park_code = themepark.park_code
where line_price> 50
order by park_city;
## Tính tổng số lượng line của từng
## ticket ở themepark có tên là GoldTown

