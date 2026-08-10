-- --------------------------------------------------------
-- 호스트:                          127.0.0.1
-- 서버 버전:                        10.6.3-MariaDB - mariadb.org binary distribution
-- 서버 OS:                        Win64
-- HeidiSQL 버전:                  11.3.0.6295
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

-- 테이블 sample.animal 구조 내보내기
CREATE TABLE IF NOT EXISTS `animal` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) DEFAULT NULL,
  `age` int(11) DEFAULT NULL,
  `owner_id` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `animal_owner_id_1115b13d_fk_person_id` (`owner_id`),
  CONSTRAINT `animal_owner_id_1115b13d_fk_person_id` FOREIGN KEY (`owner_id`) REFERENCES `owner` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb3;

-- 테이블 데이터 sample.animal:~4 rows (대략적) 내보내기
/*!40000 ALTER TABLE `animal` DISABLE KEYS */;
INSERT INTO `animal` (`id`, `name`, `age`, `owner_id`) VALUES
	(1, '슈슈', 2, 1),
	(2, '치치', 2, 1),
	(3, '마당이', 5, 2),
	(4, '얼룩이', 7, 2);
/*!40000 ALTER TABLE `animal` ENABLE KEYS */;

-- 테이블 sample.owner 구조 내보내기
CREATE TABLE IF NOT EXISTS `owner` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb3;

-- 테이블 데이터 sample.owner:~2 rows (대략적) 내보내기
/*!40000 ALTER TABLE `owner` DISABLE KEYS */;
INSERT INTO `owner` (`id`, `name`) VALUES
	(1, '최길동'),
	(2, '홍길동');
/*!40000 ALTER TABLE `owner` ENABLE KEYS */;

-- 테이블 sample.playground 구조 내보내기
CREATE TABLE IF NOT EXISTS `playground` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) DEFAULT NULL,
  `address` varchar(50) DEFAULT NULL,
  `tel` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb3;

-- 테이블 데이터 sample.playground:~2 rows (대략적) 내보내기
/*!40000 ALTER TABLE `playground` DISABLE KEYS */;
INSERT INTO `playground` (`id`, `name`, `address`, `tel`) VALUES
	(1, '용인 놀이터', '용인 처인구', '031-1234-5678'),
	(2, '안성 놀이터', '안성 보개면', '031-2345-6789');
/*!40000 ALTER TABLE `playground` ENABLE KEYS */;

-- 테이블 sample.playground_animals 구조 내보내기
CREATE TABLE IF NOT EXISTS `playground_animals` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `playground_id` bigint(20) NOT NULL,
  `animal_id` bigint(20) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `playground_animal_playground_id_animal_id_35ae57a8_uniq` (`playground_id`,`animal_id`),
  KEY `playground_animal_animal_id_9d56fa3f_fk_animal_id` (`animal_id`),
  CONSTRAINT `playground_animal_animal_id_9d56fa3f_fk_animal_id` FOREIGN KEY (`animal_id`) REFERENCES `animal` (`id`),
  CONSTRAINT `playground_animal_playground_id_9f9fd503_fk_playground_id` FOREIGN KEY (`playground_id`) REFERENCES `playground` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb3;

-- 테이블 데이터 sample.playground_animals:~6 rows (대략적) 내보내기
/*!40000 ALTER TABLE `playground_animals` DISABLE KEYS */;
INSERT INTO `playground_animals` (`id`, `playground_id`, `animal_id`) VALUES
	(1, 1, 1),
	(2, 1, 2),
	(6, 1, 4),
	(5, 2, 1),
	(3, 2, 3),
	(4, 2, 4);
/*!40000 ALTER TABLE `playground_animals` ENABLE KEYS */;

-- 테이블 sample.product 구조 내보내기
CREATE TABLE IF NOT EXISTS `product` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) DEFAULT NULL,
  `price` int(11) DEFAULT NULL,
  `animal_id` bigint(20) DEFAULT NULL,
  `warranty_id` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `warranty_id` (`warranty_id`),
  KEY `product_animal_id_9850c2fb_fk_animal_id` (`animal_id`),
  CONSTRAINT `product_animal_id_9850c2fb_fk_animal_id` FOREIGN KEY (`animal_id`) REFERENCES `animal` (`id`),
  CONSTRAINT `product_warranty_id_8c6848d5_fk_warranty_id` FOREIGN KEY (`warranty_id`) REFERENCES `warranty` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb3;

-- 테이블 데이터 sample.product:~6 rows (대략적) 내보내기
/*!40000 ALTER TABLE `product` DISABLE KEYS */;
INSERT INTO `product` (`id`, `name`, `price`, `animal_id`, `warranty_id`) VALUES
	(1, '목줄', 5000, 1, 1),
	(2, '몸통줄', 5000, 2, 2),
	(3, '중형견 사료', 10000, 1, 3),
	(4, '소형견 사료', 10000, 2, 4),
	(5, '중형묘 사료', 12000, 3, 5),
	(6, '소형묘 사료', 12000, 4, 6);
/*!40000 ALTER TABLE `product` ENABLE KEYS */;

-- 테이블 sample.warranty 구조 내보내기
CREATE TABLE IF NOT EXISTS `warranty` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `model_nm` varchar(50) DEFAULT NULL,
  `period` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb3;

-- 테이블 데이터 sample.warranty:~6 rows (대략적) 내보내기
/*!40000 ALTER TABLE `warranty` DISABLE KEYS */;
INSERT INTO `warranty` (`id`, `model_nm`, `period`) VALUES
	(1, 'A001', 2),
	(2, 'B001', 2),
	(3, 'DM01', 1),
	(4, 'DS01', 1),
	(5, 'CM01', 1),
	(6, 'CS01', 1);
/*!40000 ALTER TABLE `warranty` ENABLE KEYS */;

/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
